// Lecture des décisions La Barre (SHK-0005, sens 1, arbitrage 5.5) sur Postgres
// local jetable. La Barre est simulée par un serveur local qui suit le contrat de
// sa route /radar/decisions ; aucune installation, aucun dossier réel.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

const adminUrl = process.env.RADAR_TEST_ADMIN_URL;
if (!adminUrl) throw new Error('RADAR_TEST_ADMIN_URL local requis');
const target = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('Base de recette locale uniquement');
const name = 'shinkiro_radar_barre_' + process.pid + '_' + Date.now();
const admin = new pg.Pool({ connectionString: adminUrl });
const JETON = 'recette-barre-'.padEnd(64, '5');
const INSTANCE = 'barre-recette';
const AUTHZ = JSON.stringify({ 'alice@recette.invalid': { person: 'Alice Recette', role: 'owner' },
  'bob@recette.invalid': { person: 'Bob Recette', role: 'member' },
  'sue@recette.invalid': { person: 'Sue Recette', role: 'supervisor' } });
let db, barre, pgrest, directory, child, origin, childLogs = '';

// ---- La Barre simulée : même contrat que servir.mjs ------------------------
function canonique(v) {
  if (Array.isArray(v)) return '[' + v.map(canonique).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonique(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const servie = d => ({ ...d, empreinte_contenu: 'sha256:' + createHash('sha256').update(canonique(d)).digest('hex') });
const la = { decisions: [], ecartees: [], depot: 'recette.json', statut: 200, brut: null, requetes: [] };
const lb = createHttpServer((req, res) => {
  la.requetes.push({ url: req.url, headers: req.headers });
  if (req.url !== '/radar/decisions') { res.writeHead(404); res.end(); return; }
  if (req.headers.authorization !== 'Bearer ' + JETON) { res.writeHead(401); res.end('{}'); return; }
  if (la.statut !== 200) { res.writeHead(la.statut, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const corps = la.brut ?? JSON.stringify({ schema: 1, maison: 'Recette', depot: la.depot, decisions: la.decisions, ecartees: la.ecartees });
  const etag = '"' + createHash('sha256').update(corps).digest('hex') + '"';
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'application/json', ETag: etag }); res.end(corps);
});
let lbOrigin;

const decision = (id, champs = {}) => servie({ id, projet: 'P-1', objet: 'L-' + id, type: 'livrable', verdict: 'approuve',
  motif: null, quand: '2026-11-01T08:00:00.000Z', qui: 'direction-generale',
  acteur: { personneId: 'PER-1', nom: 'Alice Recette', poste: 'direction-creation' },
  titre: 'DECISION_PRIVEE_' + id, cree_le: '2026-11-01T08:00:01.000Z', ...champs });
const cfg = () => barre.barreConfig({ BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: JETON, BARRE_INSTANCE: INSTANCE });
const lignes = async id => (await db.query('select * from barre_recus where barre_instance=$1 and decision_id=$2 order by version', [INSTANCE, id])).rows;
const courante = async id => (await db.query('select * from barre_decisions where barre_instance=$1 and decision_id=$2 and courante', [INSTANCE, id])).rows[0];
const oublierEtag = () => db.query('update barre_lectures set etag=null where barre_instance=$1', [INSTANCE]);

const auth = who => ({ Authorization: 'Basic ' + Buffer.from(who + '@recette.invalid:recette-locale').toString('base64') });
const req = (url, who = 'alice', method = 'GET', body) => fetch(origin + url, {
  method, headers: { ...(who ? auth(who) : {}), ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
async function port() {
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const p = socket.address().port; await new Promise(r => socket.close(r)); return p;
}
async function startChild(extraEnv) {
  const p = await port(); origin = 'http://127.0.0.1:' + p; childLogs = '';
  child = spawn(process.execPath, ['server/index.js'], { cwd: new URL('../', import.meta.url),
    env: { ...process.env, DATABASE_URL: target.href, PORT: String(p), HOST: '127.0.0.1', SQLITE_PATH: path.join(directory, 'users.sqlite'),
      VISUELS_DIR: path.join(directory, 'visuels'), DASH_PASSWORD: 'recette-locale', DASH_COOKIE_SECRET: 'signature-de-recette',
      TZ: 'Africa/Douala', RADAR_API_KEY: 'machine-de-recette', FEED_TOKEN: '', RADAR_SEED_CSV: '', RADAR_AUTHZ_JSON: AUTHZ,
      RADAR_INSTANCE: 'radar-recette', BARRE_URL: '', BARRE_RADAR_TOKEN: '', BARRE_INSTANCE: '', BARRE_INTERVAL_MIN: '',
      // Flux et vue du jour publiés pour vérifier qu'aucune décision n'y passe.
      FEED_PUBLIC: '1', JOUR_PUBLIC: '1', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => { childLogs += b; }); child.stderr.on('data', b => { childLogs += b; });
  for (let i = 0; i < 100; i++) {
    try { if ((await req('/rest/v1/briefs?limit=0')).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(childLogs);
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Serveur de recette indisponible : ' + childLogs);
}
async function stopChild() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }
async function attendre(condition, quoi) {
  for (let i = 0; i < 100; i++) { if (await condition()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Attente échouée : ' + quoi + '\n' + childLogs);
}

before(async () => {
  await admin.query('create database ' + name);
  target.pathname = '/' + name;
  db = new pg.Pool({ connectionString: target.href });
  directory = await mkdtemp(path.join(tmpdir(), 'radar-barre-'));
  lb.listen(0, '127.0.0.1'); await once(lb, 'listening'); lbOrigin = 'http://127.0.0.1:' + lb.address().port;
  process.env.DATABASE_URL = target.href; process.env.RADAR_AUTHZ_JSON = AUTHZ; process.env.RADAR_INSTANCE = 'radar-recette';
  pgrest = await import('../server/pgrest.js');
  barre = await import('../server/barre.js');
  assert.equal(await pgrest.initDb(), true);
});

// Chaque étape se nettoie même si la précédente échoue : une recette rouge ne
// laisse ni processus, ni connexion, ni base derrière elle.
after(async () => {
  const etapes = [
    () => stopChild(),
    () => pgrest?.closeDb?.(),
    () => { const ferme = new Promise(r => lb.close(r)); lb.closeAllConnections(); return ferme; },
    () => db?.end(),
    // pool.end() rend la main avant que le serveur ait clos les sessions : on
    // attend qu'il n'en reste aucune, plutôt que d'en couper une en vol.
    async () => {
      for (let i = 0; i < 100; i++) {
        if (!(await admin.query('select 1 from pg_stat_activity where datname=$1', [name])).rowCount) break;
        await new Promise(r => setTimeout(r, 50));
      }
    },
    () => admin.query('drop database if exists ' + name),
    () => admin.end(),
    () => directory && rm(directory, { recursive: true, force: true }),
  ];
  for (const etape of etapes) await Promise.resolve().then(etape).catch(e => console.error('[nettoyage]', e && e.message));
});

test('sans adresse ou sans jeton suffisant, le lecteur reste désactivé et ne sort pas', async () => {
  const n = la.requetes.length;
  for (const env of [{}, { BARRE_URL: lbOrigin }, { BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: 'court' },
    { BARRE_URL: 'ftp://exemple.invalid', BARRE_RADAR_TOKEN: JETON }, { BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: JETON, BARRE_INTERVAL_MIN: '0' }]) {
    const c = barre.barreConfig(env);
    assert.equal(c.actif, false, JSON.stringify(env)); assert.ok(c.raison);
    assert.equal((await barre.lireBarre(c)).statut, 'desactive');
  }
  assert.equal(la.requetes.length, n);
  const c = cfg(); assert.equal(c.actif, true); assert.equal(c.instance, INSTANCE); assert.equal(c.intervalMs, 15 * 60000);
  assert.equal(c.route, lbOrigin + '/radar/decisions');
  assert.equal(barre.barreConfig({ BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: JETON }).instance, new URL(lbOrigin).host);
});

test('une décision lue garde sa date propre, son auteur déclaré et son empreinte', async () => {
  la.decisions = [decision('DEC-UN')];
  const r = await barre.lireBarre(cfg());
  assert.equal(r.statut, 'recu'); assert.equal(r.nouvelles, 1);
  assert.equal(la.requetes.at(-1).headers.authorization, 'Bearer ' + JETON);
  const [v1] = await lignes('DEC-UN');
  assert.equal(v1.version, 1); assert.equal(v1.etat, 'recue');
  assert.equal(v1.quand.toISOString(), '2026-11-01T08:00:00.000Z'); assert.equal(v1.quand_declare, '2026-11-01T08:00:00.000Z');
  // `at` est l'heure d'écriture dans Radar, jamais la date de la décision.
  assert.ok(Date.now() - v1.at.getTime() < 60000); assert.ok(v1.at > v1.quand);
  assert.equal(v1.qui, 'direction-generale'); assert.deepEqual(v1.acteur, { personneId: 'PER-1', nom: 'Alice Recette', poste: 'direction-creation' });
  assert.equal(v1.projet, 'P-1'); assert.equal(v1.empreinte, la.decisions[0].empreinte_contenu);
  assert.equal(v1.contenu.titre, 'DECISION_PRIVEE_DEC-UN');
});

test('un rejeu ne crée aucun doublon, avec ou sans ETag', async () => {
  const r = await barre.lireBarre(cfg());
  assert.equal(r.statut, 'inchange'); assert.ok(la.requetes.at(-1).headers['if-none-match']);
  await oublierEtag();
  const rejoue = await barre.lireBarre(cfg());
  assert.equal(rejoue.statut, 'recu'); assert.equal(rejoue.nouvelles, 0); assert.equal(rejoue.inchangees, 1);
  assert.equal((await lignes('DEC-UN')).length, 1);
});

test('des lectures concurrentes ne dupliquent rien', async () => {
  la.decisions = [...la.decisions, decision('DEC-DEUX'), decision('DEC-TROIS', { projet: 'P-2' })];
  await oublierEtag();
  // Sans If-None-Match, les trois lectures reçoivent tout et se disputent l'écriture.
  const sansEtag = (url, init) => {
    const headers = { ...init.headers }; delete headers['If-None-Match'];
    return fetch(url, { ...init, headers });
  };
  const rs = await Promise.all([1, 2, 3].map(() => barre.lireBarre(cfg(), { fetchImpl: sansEtag })));
  assert.deepEqual(rs.map(r => r.statut), ['recu', 'recu', 'recu']);
  assert.equal(rs.reduce((n, r) => n + r.nouvelles, 0), 2);
  for (const id of ['DEC-UN', 'DEC-DEUX', 'DEC-TROIS']) assert.equal((await lignes(id)).length, 1, id);
});

test('une décision changée devient une nouvelle version ; l’ancienne reste lisible', async () => {
  la.decisions = la.decisions.map(d => d.id === 'DEC-UN' ? decision('DEC-UN', { verdict: 'reserve', motif: 'Revue le lendemain' }) : d);
  const r = await barre.lireBarre(cfg());
  assert.equal(r.statut, 'recu'); assert.equal(r.versions, 1); assert.equal(r.nouvelles, 0);
  const [v1, v2] = await lignes('DEC-UN');
  assert.equal(v1.verdict, 'approuve'); assert.equal(v1.motif, null);
  assert.equal(v2.version, 2); assert.equal(v2.verdict, 'reserve'); assert.equal(v2.motif, 'Revue le lendemain');
  assert.notEqual(v1.empreinte, v2.empreinte);
  const vue = (await db.query("select version,courante from barre_decisions where decision_id='DEC-UN' order by version")).rows;
  assert.deepEqual(vue, [{ version: 1, courante: false }, { version: 2, courante: true }]);
});

test('sans correspondance, la décision reste non rattachée ; aucun code Radar n’est deviné', async () => {
  // Un dossier dont le code ressemble au projet ne vaut pas correspondance.
  await db.query("insert into briefs(ndeg,projet) values ('P-1','HOMONYME_DU_PROJET'),('P-2','AUTRE')");
  la.decisions = [...la.decisions, decision('DEC-CAMPAGNE', { projet: null, campagne: 'C-1', type: 'composition' })];
  await barre.lireBarre(cfg());
  assert.equal((await courante('DEC-UN')).rattachement, 'non_rattachee');
  assert.equal((await courante('DEC-UN')).brief_id, null);
  assert.equal((await courante('DEC-CAMPAGNE')).rattachement, 'sans_projet');
  const brief = (await db.query("insert into briefs(ndeg,projet) values ('RAT-1','Dossier rattaché') returning id")).rows[0].id;
  await db.query("insert into barre_projets(barre_instance,projet,radar_instance,brief_id) values ($1,'P-2','radar-recette',$2)", [INSTANCE, brief]);
  const r = await courante('DEC-TROIS');
  assert.equal(r.rattachement, 'rattachee'); assert.equal(Number(r.brief_id), Number(brief));
  assert.equal((await courante('DEC-UN')).rattachement, 'non_rattachee');
});

test('une décision retirée ou remplacée est notée comme telle, jamais effacée', async () => {
  // DEC-DEUX disparaît ; DEC-QUATRE la remplace ; DEC-TROIS n'est pas servie mais nommée écartée.
  la.decisions = la.decisions.filter(d => !['DEC-DEUX', 'DEC-TROIS'].includes(d.id)).concat(decision('DEC-QUATRE', { remplace: 'DEC-DEUX' }));
  la.ecartees = [{ id: 'DEC-TROIS', raison: 'identifiant en double' }];
  const r = await barre.lireBarre(cfg());
  assert.equal(r.retirees, 1); assert.equal(r.ecartees, 1);
  const deux = await lignes('DEC-DEUX');
  assert.deepEqual(deux.map(l => l.etat), ['recue', 'retiree']);
  assert.equal(deux[1].titre, deux[0].titre); assert.equal(deux[1].quand.toISOString(), deux[0].quand.toISOString());
  assert.equal(deux[1].empreinte, null);
  assert.equal((await courante('DEC-DEUX')).remplacee_par, 'DEC-QUATRE');
  assert.equal((await courante('DEC-QUATRE')).remplace, 'DEC-DEUX');
  assert.deepEqual((await lignes('DEC-TROIS')).map(l => l.etat), ['recue']);
  // Elle revient : une nouvelle version, l'histoire reste.
  la.decisions = [...la.decisions, decision('DEC-DEUX')]; la.ecartees = [];
  await barre.lireBarre(cfg());
  assert.deepEqual((await lignes('DEC-DEUX')).map(l => l.etat), ['recue', 'retiree', 'recue']);
  // Une autre base de référence n'efface pas les décisions de la première.
  la.depot = 'autre.json'; const avant = la.decisions; la.decisions = [];
  const autre = await barre.lireBarre(cfg());
  assert.equal(autre.statut, 'recu'); assert.equal(autre.retirees, 0); assert.match(autre.message, /base de référence/);
  assert.equal((await courante('DEC-UN')).etat, 'recue');
  la.depot = 'recette.json'; la.decisions = avant;
  await barre.lireBarre(cfg());
});

test('une réponse refusée, illisible ou altérée ne vaut ni décision ni retrait', async () => {
  const compte = async () => (await db.query('select count(*)::int as n from barre_recus')).rows[0].n;
  const n = await compte();
  const etag = (await db.query('select etag from barre_lectures where barre_instance=$1', [INSTANCE])).rows[0].etag;
  await oublierEtag();
  for (const [quoi, regler] of [
    ['401', () => { la.statut = 401; }], ['503', () => { la.statut = 503; }],
    ['illisible', () => { la.brut = '{interrompu'; }], ['autre schéma', () => { la.brut = JSON.stringify({ schema: 2, depot: 'recette.json', decisions: [] }); }],
    ['sans liste', () => { la.brut = JSON.stringify({ schema: 1, depot: 'recette.json' }); }],
  ]) {
    regler();
    const r = await barre.lireBarre(cfg());
    assert.equal(r.statut, 'echec', quoi); assert.equal(await compte(), n, quoi);
    la.statut = 200; la.brut = null;
  }
  const lecture = (await db.query('select * from barre_lectures where barre_instance=$1', [INSTANCE])).rows[0];
  assert.equal(lecture.statut, 'echec'); assert.ok(lecture.message); assert.equal(lecture.etag, null);
  // Une empreinte qui ne correspond pas au contenu : refusée, et pas retirée pour autant.
  const altere = { ...decision('DEC-UN', { verdict: 'hors', motif: 'Altéré' }), empreinte_contenu: la.decisions[0].empreinte_contenu };
  la.decisions = [altere, ...la.decisions.slice(1)];
  const r = await barre.lireBarre(cfg());
  assert.equal(r.statut, 'recu'); assert.equal(r.refusees, 1); assert.equal(r.retirees, 0);
  assert.equal((await courante('DEC-UN')).verdict, 'reserve');
  assert.equal(await compte(), n);
  la.decisions = [decision('DEC-UN', { verdict: 'reserve', motif: 'Revue le lendemain' }), ...la.decisions.slice(1)];
  assert.ok(etag);
});

test('le serveur lit La Barre à intervalle, reprend son ETag et ne publie rien dans le flux', async () => {
  const events = (await db.query('select count(*)::int as n from task_events')).rows[0].n;
  await barre.lireBarre(cfg());
  const etag = (await db.query('select etag from barre_lectures where barre_instance=$1', [INSTANCE])).rows[0].etag;
  const n = la.requetes.length;
  await startChild({ BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: JETON, BARRE_INSTANCE: INSTANCE, BARRE_INTERVAL_MIN: '0.01' });
  await attendre(() => la.requetes.length >= n + 2, 'deux lectures périodiques');
  // Le redémarrage reprend l'empreinte gardée en base : pas de relecture complète.
  assert.equal(la.requetes[n].headers['if-none-match'], etag);
  la.decisions = [...la.decisions, decision('DEC-PERIODIQUE', { titre: 'DECISION_PRIVEE_PERIODIQUE' })];
  await attendre(async () => (await lignes('DEC-PERIODIQUE')).length === 1, 'décision lue par le serveur');
  assert.match(childLogs, /\[barre\]/);
  assert.equal((await db.query('select count(*)::int as n from task_events')).rows[0].n, events);
  for (const route of ['/activity.json', '/feed.xml', '/jour.json']) {
    const reponse = await req(route, null);
    assert.equal(reponse.status, 200, route);
    const texte = await reponse.text();
    assert.ok(!texte.includes('DECISION_PRIVEE'), route);
  }
  assert.ok(!JSON.stringify(await (await req('/rest/v1/task_events')).json()).includes('DECISION_PRIVEE'));
});

test('les décisions se lisent par superviseur ; un membre est refusé ; un dossier privé reste privé', async () => {
  assert.equal((await req('/rest/v1/barre_decisions', 'bob')).status, 403);
  assert.equal((await req('/rest/v1/barre_lectures', 'bob')).status, 403);
  const prive = (await db.query("insert into briefs(ndeg,projet,private_to) values ('RAT-PRIVE','Privé','Alice Recette') returning id")).rows[0].id;
  la.decisions = [...la.decisions, decision('DEC-PRIVEE', { projet: 'P-PRIVE' })];
  await db.query("insert into barre_projets(barre_instance,projet,radar_instance,brief_id) values ($1,'P-PRIVE','radar-recette',$2)", [INSTANCE, prive]);
  await attendre(async () => (await lignes('DEC-PRIVEE')).length === 1, 'décision privée lue');
  const sue = await (await req('/rest/v1/barre_decisions?courante=is.true', 'sue')).json();
  const ids = sue.map(d => d.decision_id);
  assert.ok(ids.includes('DEC-UN')); assert.equal(sue.find(d => d.decision_id === 'DEC-UN').rattachement, 'non_rattachee');
  assert.ok(ids.includes('DEC-TROIS')); assert.ok(!ids.includes('DEC-PRIVEE'));
  const alice = await (await req('/rest/v1/barre_decisions?decision_id=eq.DEC-PRIVEE', 'alice')).json();
  assert.equal(alice.length, 1); assert.equal(alice[0].rattachement, 'rattachee');
  const machine = await fetch(origin + '/rest/v1/barre_decisions?decision_id=eq.DEC-PRIVEE', { headers: { Authorization: 'Bearer machine-de-recette' } });
  assert.equal((await machine.json()).length, 1);
  assert.equal((await (await req('/rest/v1/barre_lectures', 'sue')).json())[0].barre_instance, INSTANCE);
  assert.equal((await req('/rest/v1/barre_decisions', 'alice', 'POST', { decision_id: 'FAUX' })).status, 405);
  assert.equal((await req('/rest/v1/barre_decisions?decision_id=eq.DEC-UN', 'alice', 'PATCH', { verdict: 'hors' })).status, 405);
});

test('la correspondance projet ↔ dossier se tient dans Radar, par un superviseur', async () => {
  const brief = (await db.query("insert into briefs(ndeg,projet) values ('RAT-SUE','Dossier de Sue') returning id")).rows[0].id;
  const prive = (await db.query("select id from briefs where ndeg='RAT-PRIVE'")).rows[0].id;
  const corps = { barre_instance: INSTANCE, projet: 'P-1', brief_id: brief };
  assert.equal((await req('/rest/v1/barre_projets', 'bob', 'POST', corps)).status, 403);
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', { ...corps, radar_instance: 'autre' })).status, 400);
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', { ...corps, created_by: 'quelqu’un' })).status, 400);
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', { ...corps, brief_id: 999999999 })).status, 404);
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', { ...corps, brief_id: prive })).status, 403);
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', { projet: 'P-1', brief_id: brief })).status, 400);
  const cree = await req('/rest/v1/barre_projets', 'sue', 'POST', corps);
  assert.equal(cree.status, 201);
  const [m] = await cree.json();
  assert.equal(m.radar_instance, 'radar-recette'); assert.equal(m.created_by, 'sue@recette.invalid');
  assert.equal((await req('/rest/v1/barre_projets', 'sue', 'POST', corps)).status, 409);
  assert.equal((await courante('DEC-UN')).rattachement, 'rattachee');
  assert.equal((await req('/rest/v1/barre_projets?id=eq.' + m.id, 'sue', 'PATCH', { brief_id: prive })).status, 405);
  assert.equal((await req('/rest/v1/barre_projets?id=eq.' + m.id, 'bob', 'DELETE')).status, 403);
  // La correspondance vers un dossier privé d'Alice reste hors de vue de Sue.
  assert.ok(!(await (await req('/rest/v1/barre_projets', 'sue')).json()).some(x => x.projet === 'P-PRIVE'));
  assert.equal((await req('/rest/v1/barre_projets?id=eq.' + m.id, 'sue', 'DELETE')).status, 200);
  assert.equal((await courante('DEC-UN')).rattachement, 'non_rattachee');
});

test('sans configuration, le serveur démarre sans lecteur et ne sort pas', async () => {
  await stopChild();
  const n = la.requetes.length;
  await startChild({ BARRE_URL: lbOrigin, BARRE_RADAR_TOKEN: 'court', BARRE_INTERVAL_MIN: '0.01' });
  await new Promise(r => setTimeout(r, 1500));
  assert.equal(la.requetes.length, n);
  assert.match(childLogs, /\[barre\] lecteur désactivé/);
});
