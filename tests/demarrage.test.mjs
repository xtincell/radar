// La base démarre après l'application : c'est ce qui arrive au redémarrage d'un hôte où
// les deux conteneurs partent en même temps. Le Radar doit s'en remettre seul, sans être
// relancé. Sur Postgres local jetable ; aucun dossier réel.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

const adminUrl = process.env.RADAR_TEST_ADMIN_URL;
if (!adminUrl) throw new Error('RADAR_TEST_ADMIN_URL local requis');
const target = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('Base de recette locale uniquement');
const name = 'shinkiro_radar_demarrage_' + process.pid + '_' + Date.now();
const admin = new pg.Pool({ connectionString: adminUrl });
let child, relais, origin, directory, portRelais, logs = '';

const auth = { Authorization: 'Basic ' + Buffer.from('alice@recette.invalid:recette-locale').toString('base64') };
const lire = () => fetch(origin + '/rest/v1/briefs?limit=0', { headers: auth });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function portLibre() {
  const s = net.createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  const { port } = s.address(); await new Promise((resolve) => s.close(resolve)); return port;
}

before(async () => {
  await admin.query('create database ' + name);
  directory = await mkdtemp(path.join(tmpdir(), 'radar-demarrage-'));
  portRelais = await portLibre();
  origin = 'http://127.0.0.1:' + await portLibre();
});

after(async () => {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  if (relais) await new Promise((resolve) => { relais.close(resolve); for (const s of relais.prises) s.destroy(); });
  await admin.query('drop database if exists ' + name + ' with (force)');
  await admin.end();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('la base démarre après l\'application : le Radar la rejoint seul, sans redémarrage', { timeout: 60000 }, async () => {
  // L'application vise un port où rien n'écoute encore : la base « n'a pas démarré ».
  const base = new URL(target.href); base.port = String(portRelais); base.pathname = '/' + name;
  child = spawn(process.execPath, ['server/index.js'], { cwd: new URL('../', import.meta.url),
    env: { ...process.env, DATABASE_URL: base.href, PORT: new URL(origin).port, HOST: '127.0.0.1', RADAR_DB_RETRY_MS: '200',
      SQLITE_PATH: path.join(directory, 'users.sqlite'), VISUELS_DIR: path.join(directory, 'visuels'),
      DASH_PASSWORD: 'recette-locale', DASH_COOKIE_SECRET: 'signature-de-recette', RADAR_API_KEY: 'machine-de-recette',
      FEED_TOKEN: '', RADAR_SEED_CSV: '', BARRE_URL: '', BARRE_RADAR_TOKEN: '',
      RADAR_AUTHZ_JSON: JSON.stringify({ 'alice@recette.invalid': { person: 'Alice Recette', role: 'owner' } }),
    }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (b) => { logs += b; }); child.stderr.on('data', (b) => { logs += b; });

  let avant = null;
  for (let i = 0; i < 100 && !avant; i++) {
    if (child.exitCode !== null) throw new Error('le serveur s\'est arrêté : ' + logs);
    try { avant = await lire(); } catch { await pause(100); }
  }
  assert.ok(avant, 'le serveur écoute même sans base : ' + logs);
  assert.ok(avant.status >= 500, `sans base, une lecture échoue proprement (${avant.status})`);
  assert.doesNotMatch(logs, /Postgres prêt/);

  // La base « démarre » : un relais ouvre le port attendu vers le vrai Postgres.
  relais = net.createServer((client) => {
    const amont = net.connect(Number(target.port) || 5432, target.hostname.replace(/^\[|\]$/g, ''));
    relais.prises.add(client); relais.prises.add(amont);
    client.on('error', () => amont.destroy()); amont.on('error', () => client.destroy());
    client.pipe(amont).pipe(client);
  });
  relais.prises = new Set();
  relais.listen(portRelais, '127.0.0.1'); await once(relais, 'listening');

  let apres = null;
  for (let i = 0; i < 150; i++) {
    const r = await lire();
    if (r.ok) { apres = r; break; }
    await pause(100);
  }
  assert.ok(apres, 'l\'API répond une fois la base joignable : ' + logs);
  assert.deepEqual(await apres.json(), []);
  assert.equal(child.exitCode, null, 'le même processus, jamais relancé');
  for (let i = 0; i < 50 && !/Postgres prêt/.test(logs); i++) await pause(100);
  assert.match(logs, /Postgres prêt/, 'le démarrage reprend : purge et lecteur lancés une fois la base là');
});
