// Mots de passe personnels : empreinte salée et lente, conversion à la connexion
// et conversion en masse. Serveur sans Postgres : le mur d'authentification,
// /profil et le stockage SQLite suffisent ; aucune donnée réelle n'est utilisée.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SHARED = 'partage-recette-mdp';
const COOKIE_SECRET = 'signature-recette-mdp';
const ROOT = new URL('../', import.meta.url);
const u = process.pid + '-' + Date.now();
const people = ['alice', 'bob', 'carla', 'dan', 'eve', 'fred', 'gil'];
let child, origin, directory, sqlitePath, logs = '';

const basic = (email, password) => 'Basic ' + Buffer.from(email + ':' + password, 'utf8').toString('base64');
const mail = who => who + '@mdp.invalid';
const login = (who, password) => fetch(origin + '/profil', { headers: { Authorization: basic(mail(who), password) } });
const setPersonal = (who, current, nouveau) => fetch(origin + '/profil', {
  method: 'POST', headers: { Authorization: basic(mail(who), current), 'content-type': 'application/json' },
  body: JSON.stringify({ nouveau }),
});

function withDb(file, fn) {
  const db = new DatabaseSync(file);
  try { db.exec('PRAGMA busy_timeout = 2000'); return fn(db); } finally { db.close(); }
}
const stored = (who, file = sqlitePath) =>
  withDb(file, db => db.prepare('select password from dash_users where email = ?').get(mail(who))?.password);
// Écriture brute : simule un ancien contenu, hors des chemins applicatifs.
const seed = (who, value, file = sqlitePath) => withDb(file, db => {
  db.exec('create table if not exists dash_users (email text primary key, password text not null)');
  db.prepare('insert into dash_users (email, password) values (?, ?) on conflict(email) do update set password = excluded.password')
    .run(mail(who), value);
});
const fileContains = async (file, text) => (await readFile(file)).includes(Buffer.from(text, 'utf8'));

// Implémentation de référence indépendante (node:crypto) : le format doit être
// lisible sans le code applicatif.
function referenceHash(password, iterations = 600000, salt = randomBytes(16)) {
  const hash = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function referenceVerify(password, value) {
  const [scheme, iterations, salt, hash] = String(value).split('$');
  if (scheme !== 'pbkdf2-sha256') return false;
  const expected = Buffer.from(hash, 'base64');
  const got = pbkdf2Sync(Buffer.from(password, 'utf8'), Buffer.from(salt, 'base64'), Number(iterations), expected.length, 'sha256');
  return timingSafeEqual(got, expected);
}
// Cookie de session tel que le produisait le code avant ce changement.
function sessionCookie(email, exp = Math.floor(Date.now() / 1000) + 3600) {
  const data = `${email}|${exp}`;
  return 'radar_sess=' + Buffer.from(data).toString('base64url') + '.' +
    createHmac('sha256', COOKIE_SECRET).update(data).digest('base64url');
}

async function runConversion(file, ...args) {
  const p = spawn(process.execPath, ['server/hash-passwords.js', ...args], {
    cwd: ROOT, env: { ...process.env, SQLITE_PATH: file }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', b => { out += b; }); p.stderr.on('data', b => { out += b; });
  const [code] = await once(p, 'exit');
  return { code, out };
}

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'radar-mdp-'));
  sqlitePath = path.join(directory, 'users.sqlite3');
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(r => socket.close(r)); origin = 'http://127.0.0.1:' + port;
  child = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, DATABASE_URL: '', PORT: String(port), HOST: '127.0.0.1', SQLITE_PATH: sqlitePath,
    VISUELS_DIR: path.join(directory, 'visuels'), DASH_PASSWORD: SHARED, DASH_COOKIE_SECRET: COOKIE_SECRET,
    DASH_ALLOWLIST: '', RADAR_API_KEY: '', FEED_TOKEN: '', RADAR_SEED_CSV: '', TZ: 'Africa/Douala',
    RADAR_AUTHZ_JSON: JSON.stringify(Object.fromEntries(people.map(p => [mail(p), { person: p, role: 'member' }]))),
  } });
  child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; });
  for (let i = 0; i < 100; i++) {
    try { if ((await login('alice', SHARED)).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(logs);
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Serveur de recette indisponible : ' + logs);
});

after(async () => {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('l’empreinte est auto-décrite, salée, lente et lisible par une implémentation indépendante', async () => {
  const pw = await import('../functions/_password.js');
  const a = await pw.hashPassword('Mot-de-passe-1'), b = await pw.hashPassword('Mot-de-passe-1');
  assert.match(a, /^pbkdf2-sha256\$600000\$[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=$/);
  assert.notEqual(a, b, 'un sel aléatoire par empreinte');
  assert.ok(referenceVerify('Mot-de-passe-1', a));
  assert.deepEqual(await pw.verifyPassword('Mot-de-passe-1', referenceHash('Mot-de-passe-1')), { ok: true, rehash: false });
  assert.equal((await pw.verifyPassword('mot-de-passe-1', a)).ok, false);
  // Un préfixe présent mais illisible n'est jamais relu comme un mot de passe en clair.
  const broken = 'pbkdf2-sha256$600000$pas-du-base64';
  assert.equal((await pw.verifyPassword(broken, broken)).ok, false);
  assert.equal((await pw.verifyPassword('', a)).ok, false);
});

test('le stockage refuse toute valeur qui n’est pas une empreinte', async () => {
  const { openKv } = await import('../server/kv-sqlite.js');
  const kv = openKv(path.join(directory, 'garde.sqlite3'));
  await assert.rejects(kv.put(mail('garde'), 'valeur-en-clair'));
  await assert.rejects(kv.put(mail('garde'), 'pbkdf2-sha256$600000$illisible'));
  await kv.put(mail('garde'), referenceHash('Garde-1'));
  assert.ok(referenceVerify('Garde-1', await kv.get(mail('garde'))));
});

test('/profil n’écrit qu’une empreinte : ni la table ni le fichier ne contiennent le mot de passe', async () => {
  const np = 'Nouveau-bob-' + u;
  assert.equal((await setPersonal('bob', SHARED, np)).status, 200);
  const value = stored('bob');
  assert.match(value, /^pbkdf2-sha256\$600000\$/);
  assert.ok(!value.includes(np));
  assert.ok(referenceVerify(np, value));
  assert.equal(await fileContains(sqlitePath, np), false);
  // GET /profil dit seulement qu'un mot de passe personnel existe.
  const r = await login('bob', np); assert.equal(r.status, 200);
  const body = await r.text(), d = JSON.parse(body);
  assert.equal(d.perso, true);
  assert.deepEqual(Object.keys(d).sort(), ['email', 'kv', 'ok', 'perso', 'person', 'role', 'taskMonth']);
  assert.ok(!body.includes('pbkdf2') && !body.includes(np));
});

test('une connexion fonctionne avec l’empreinte ; ni le mot de passe partagé ni l’empreinte elle-même ne l’ouvrent', async () => {
  const pass = 'Empreinte-carla-' + u, value = referenceHash(pass);
  seed('carla', value);
  const ok = await login('carla', pass);
  assert.equal(ok.status, 200); assert.match(ok.headers.get('set-cookie') || '', /radar_sess=/);
  assert.equal((await login('carla', SHARED)).status, 401);
  assert.equal((await login('carla', value)).status, 401);
  assert.equal((await login('carla', pass + 'x')).status, 401);
  assert.equal(stored('carla'), value, 'une empreinte à jour n’est pas réécrite');
});

test('un ancien mot de passe en clair est accepté une fois puis remplacé par son empreinte', async () => {
  const pass = 'Ancien-clair-dan-' + u;
  seed('dan', pass);
  // Une ligne écrite après : l'ancienne cellule n'est plus en tête de page, et
  // seul un effacement sécurisé la fait disparaître du fichier.
  seed('gil', referenceHash('Voisin-gil-' + u));
  assert.equal((await login('dan', 'mauvais-' + u)).status, 401);
  assert.equal(stored('dan'), pass, 'un échec ne convertit rien');
  assert.equal((await login('dan', pass)).status, 200);
  const value = stored('dan');
  assert.match(value, /^pbkdf2-sha256\$600000\$/);
  assert.ok(referenceVerify(pass, value));
  assert.equal(await fileContains(sqlitePath, pass), false);
  assert.equal((await login('dan', pass)).status, 200);
  assert.equal(stored('dan'), value);
  assert.equal((await login('dan', value)).status, 401);
});

test('une empreinte aux paramètres dépassés est renforcée à la connexion', async () => {
  const pass = 'Faible-eve-' + u, weak = referenceHash(pass, 100000);
  seed('eve', weak);
  assert.equal((await login('eve', pass)).status, 200);
  const value = stored('eve');
  assert.notEqual(value, weak); assert.match(value, /^pbkdf2-sha256\$600000\$/); assert.ok(referenceVerify(pass, value));
});

test('le mot de passe partagé reste valable sans mot de passe personnel ; un mauvais mot de passe est refusé', async () => {
  assert.equal((await login('alice', SHARED)).status, 200);
  assert.equal((await login('alice', SHARED + 'x')).status, 401);
  assert.equal((await login('alice', '')).status, 401);
  assert.equal((await fetch(origin + '/profil', { headers: { Authorization: basic('inconnu@mdp.invalid', SHARED) } })).status, 401);
  assert.equal(stored('alice'), undefined);
});

test('les sessions déjà ouvertes restent valides', async () => {
  const r = await fetch(origin + '/profil', { headers: { Cookie: sessionCookie(mail('dan')) } });
  assert.equal(r.status, 200); assert.equal((await r.json()).email, mail('dan'));
  assert.equal((await fetch(origin + '/profil', { headers: { Cookie: sessionCookie(mail('dan')) + 'x' } })).status, 401);
});

test('un mot de passe personnel accentué défini dans /profil ouvre la session', async () => {
  const np = 'Clé-été-ñ-' + u;
  assert.equal((await setPersonal('fred', SHARED, np)).status, 200);
  assert.ok(referenceVerify(np, stored('fred')));
  assert.equal((await login('fred', np)).status, 200);
  assert.equal(await fileContains(sqlitePath, np), false);
});

test('la conversion en masse remplace toutes les valeurs en clair et reste idempotente', async () => {
  const file = path.join(directory, 'masse.sqlite3');
  const plain = { alice: 'Masse-un-' + u, bob: 'Masse-deux-é-' + u };
  const hashed = referenceHash('Masse-trois-' + u);
  seed('alice', plain.alice, file); seed('bob', plain.bob, file); seed('carla', hashed, file); seed('dan', '', file);
  assert.equal((await runConversion(file, '--check')).code, 1, 'le contrôle signale le clair restant');
  assert.equal(stored('alice', file), plain.alice, 'le contrôle n’écrit rien');

  const first = await runConversion(file);
  assert.equal(first.code, 0, first.out); assert.match(first.out, /2 convertie/);
  for (const [who, pass] of Object.entries(plain)) {
    assert.match(stored(who, file), /^pbkdf2-sha256\$600000\$/); assert.ok(referenceVerify(pass, stored(who, file)));
    assert.equal(await fileContains(file, pass), false);
  }
  assert.equal(stored('carla', file), hashed);
  assert.equal(stored('dan', file), '', 'une valeur vide n’est pas un mot de passe');

  const values = people.map(p => stored(p, file));
  const second = await runConversion(file);
  assert.equal(second.code, 0, second.out); assert.match(second.out, /0 convertie/);
  assert.deepEqual(people.map(p => stored(p, file)), values);
  assert.equal((await runConversion(file, '--check')).code, 0);
});

test('la conversion refuse un fichier absent au lieu d’en créer un vide', async () => {
  const missing = path.join(directory, 'absent.sqlite3');
  assert.notEqual((await runConversion(missing)).code, 0);
  assert.equal(existsSync(missing), false);
});
