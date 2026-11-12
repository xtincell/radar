// Indicateurs avant/après (arbitrage 5.6 du 12 novembre 2026) sur Postgres local
// jetable. Les dossiers sont écrits par SQL, le journal se remplit par le
// trigger, puis chaque événement est daté à rebours autour d'une bascule
// choisie ; aucun dossier réel, aucune installation La Barre.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

const adminUrl = process.env.RADAR_TEST_ADMIN_URL;
if (!adminUrl) throw new Error('RADAR_TEST_ADMIN_URL local requis');
const target = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('Base de recette locale uniquement');
const name = 'shinkiro_radar_mesure_' + process.pid + '_' + Date.now();
const admin = new pg.Pool({ connectionString: adminUrl });
const AUTHZ = JSON.stringify({ 'alice@recette.invalid': { person: 'Alice Recette', role: 'owner' },
  'bob@recette.invalid': { person: 'Bob Recette', role: 'member' },
  'sue@recette.invalid': { person: 'Sue Recette', role: 'supervisor' } });
const JOUR = 864e5;
// Bascule des scénarios : 60 jours avant le lancement de la recette, fenêtres
// de 30 jours ; toutes les dates de faits sont à plus d'un jour des bornes.
const B = new Date(Math.floor((Date.now() - 60 * JOUR) / 1000) * 1000);
const t = j => new Date(B.getTime() + j * JOUR);
const jour = j => t(j).toISOString().slice(0, 10);
let db, child, origin, directory, childLogs = '';

const auth = who => ({ Authorization: 'Basic ' + Buffer.from(who + '@recette.invalid:recette-locale').toString('base64') });
const req = (url, who = 'sue') => fetch(origin + url, {
  headers: who === 'machine' ? { Authorization: 'Bearer machine-de-recette' } : who ? auth(who) : {},
});
const mesure = async (who = 'sue', q = '?jours=30') => {
  const r = await req('/mesure/avant-apres' + q, who);
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
};
async function port() {
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const p = socket.address().port; await new Promise(r => socket.close(r)); return p;
}
async function startChild(extraEnv = {}) {
  const p = await port(); origin = 'http://127.0.0.1:' + p; childLogs = '';
  child = spawn(process.execPath, ['server/index.js'], { cwd: new URL('../', import.meta.url),
    env: { ...process.env, DATABASE_URL: target.href, PORT: String(p), HOST: '127.0.0.1', SQLITE_PATH: path.join(directory, 'users.sqlite'),
      VISUELS_DIR: path.join(directory, 'visuels'), DASH_PASSWORD: 'recette-locale', DASH_COOKIE_SECRET: 'signature-de-recette',
      TZ: 'Africa/Douala', RADAR_API_KEY: 'machine-de-recette', FEED_TOKEN: '', FEED_PUBLIC: '', JOUR_PUBLIC: '', RADAR_SEED_CSV: '',
      RADAR_AUTHZ_JSON: AUTHZ, BARRE_URL: '', BARRE_RADAR_TOKEN: '', MESURE_BASCULE: '', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => { childLogs += b; }); child.stderr.on('data', b => { childLogs += b; });
  for (let i = 0; i < 100; i++) {
    try { if ((await req('/rest/v1/briefs?limit=0', 'machine')).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(childLogs);
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Serveur de recette indisponible : ' + childLogs);
}
async function stopChild() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }
async function restart(extraEnv) { await stopChild(); await startChild(extraEnv); }
// Serveur de scénario : bascule B fixée. Un cas qui change l'environnement le
// rétablit en sortant, même en échec : chaque cas se lance seul.
const SCENARIO = () => ({ MESURE_BASCULE: B.toISOString() });
async function avecEnv(extraEnv, fn) {
  await restart(extraEnv);
  try { await fn(); } finally { await restart(SCENARIO()); }
}

// Écrit un dossier puis rejoue ses écritures ; chaque écriture produit ses
// événements par le trigger, datés ensuite au jour voulu (relatif à la bascule).
async function dossier(champs, ouverture, ecritures = []) {
  const avant = await maxEvent();
  const cols = Object.keys(champs);
  const { rows } = await db.query(`insert into briefs(${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) returning id`,
    Object.values(champs));
  const id = Number(rows[0].id);
  await dater(id, avant, ouverture);
  for (const [j, set] of ecritures) {
    const depuis = await maxEvent();
    const k = Object.keys(set);
    await db.query(`update briefs set ${k.map((c, i) => c + '=$' + (i + 2)).join(',')} where id=$1`, [id, ...Object.values(set)]);
    await dater(id, depuis, j);
  }
  return id;
}
const maxEvent = async () => Number((await db.query('select coalesce(max(id),0) as n from task_events')).rows[0].n);
async function dater(id, depuis, j) {
  const { rowCount } = await db.query('update task_events set at=$3 where brief_id=$1 and id>$2', [id, depuis, t(j)]);
  assert.ok(rowCount >= 1, 'écriture sans événement pour le dossier ' + id);
}
const clos = (j, statut = 'Bouclé') => [j, { statut, closed_at: t(j).toISOString() }];
async function decision(id, champs) {
  const c = { barre_instance: 'barre-recette', decision_id: id, version: 1, etat: 'recue', empreinte: 'sha256:' + id, ...champs };
  const cols = Object.keys(c);
  await db.query(`insert into barre_recus(${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(c));
}
const correspondance = (projet, brief) => db.query(
  "insert into barre_projets(barre_instance,projet,radar_instance,brief_id) values ('barre-recette',$1,'radar-recette',$2)", [projet, brief]);
const vider = () => db.query('truncate briefs, task_events, comments, brief_assets, barre_recus, barre_projets, barre_lectures restart identity');

before(async () => {
  await admin.query('create database ' + name);
  target.pathname = '/' + name;
  db = new pg.Pool({ connectionString: target.href });
  directory = await mkdtemp(path.join(tmpdir(), 'radar-mesure-'));
  await startChild(SCENARIO());
});

after(async () => {
  const etapes = [
    () => stopChild(),
    () => db?.end(),
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

beforeEach(() => vider());

test('sans lecture réussie de La Barre ni date fournie, aucune fenêtre n’est calculée', () => avecEnv({}, async () => {
  // Une lecture en échec n'est pas une bascule.
  await db.query("insert into barre_lectures(barre_instance,lu_le,statut,message) values ('barre-recette',now(),'echec','La Barre injoignable')");
  await dossier({ ndeg: 'SANS-1', statut: 'En cours' }, -3, [clos(-1)]);
  const m = await mesure('sue', '');
  assert.equal(m.bascule.date, null); assert.equal(m.bascule.source, null);
  assert.match(m.bascule.motif, /aucune lecture réussie/);
  assert.equal(m.fenetres, null); assert.equal(m.avant, null); assert.equal(m.apres, null); assert.equal(m.a_cheval, null);
}));

test('la bascule vient de la première lecture réussie de La Barre ; la dernière réussite seule est provisoire', () => avecEnv({}, async () => {
  const reussite = new Date(Date.now() - 20 * JOUR);
  await db.query("insert into barre_lectures(barre_instance,lu_le,statut,derniere_reussite) values ('barre-recette',now(),'inchange',$1)", [reussite]);
  let m = await mesure('sue', '');
  assert.equal(m.bascule.source, 'barre_lectures.derniere_reussite');
  assert.equal(m.bascule.date, reussite.toISOString()); assert.equal(m.bascule.provisoire, true);
  assert.match(m.bascule.motif, /provisoire/);
  // Un reçu écrit plus tôt prouve une lecture réussie plus ancienne, et ne se réécrit pas.
  const premier = new Date(Date.now() - 25 * JOUR);
  await decision('DEC-ANCIENNE', { at: premier, quand: premier, verdict: 'approuve' });
  m = await mesure('sue', '');
  assert.equal(m.bascule.source, 'barre_recus.at'); assert.equal(m.bascule.date, premier.toISOString());
  assert.equal(m.bascule.provisoire, false);
  // Bascule il y a 25 jours, 90 demandés : deux fenêtres de 25 jours, réduction dite.
  assert.equal(m.fenetres.longueur_demandee_jours, 90); assert.equal(m.fenetres.tronquee, true);
  assert.ok(Math.abs(m.fenetres.longueur_jours - 25) < 0.01, String(m.fenetres.longueur_jours));
  assert.match(m.fenetres.motif, /réduites/);
  assert.equal(new Date(m.fenetres.avant.fin).getTime(), premier.getTime());
  assert.equal(new Date(m.fenetres.apres.debut).getTime(), premier.getTime());
  const dureeAvant = new Date(m.fenetres.avant.fin) - new Date(m.fenetres.avant.debut);
  const dureeApres = new Date(m.fenetres.apres.fin) - new Date(m.fenetres.apres.debut);
  assert.equal(dureeAvant, dureeApres);
  // Longueur paramétrable, bornée.
  m = await mesure('sue', '?jours=10');
  assert.equal(m.fenetres.longueur_jours, 10); assert.equal(m.fenetres.tronquee, false);
  for (const q of ['?jours=0', '?jours=abc', '?jours=-3', '?jours=4000', '?jours=2.5']) {
    assert.equal((await req('/mesure/avant-apres' + q)).status, 400, q);
  }
}));

test('MESURE_BASCULE prime sur La Barre ; une valeur illisible ne calcule rien', async () => {
  await decision('DEC-ANCIENNE', { at: new Date(Date.now() - 25 * JOUR), verdict: 'approuve' });
  await avecEnv({ MESURE_BASCULE: '2026-01-15' }, async () => {
    const m = await mesure('sue', '');
    assert.equal(m.bascule.source, 'MESURE_BASCULE'); assert.equal(m.bascule.date, '2026-01-15T00:00:00.000Z');
    assert.equal(m.bascule.provisoire, false);
  });
  await avecEnv({ MESURE_BASCULE: 'mardi dernier' }, async () => {
    const m = await mesure('sue', '');
    assert.equal(m.bascule.date, null); assert.match(m.bascule.motif, /MESURE_BASCULE illisible/);
    assert.equal(m.fenetres, null); assert.equal(m.apres, null);
  });
  await avecEnv({ MESURE_BASCULE: new Date(Date.now() + 5 * JOUR).toISOString() }, async () => {
    const m = await mesure('sue', '');
    assert.equal(m.fenetres, null); assert.match(m.bascule.motif, /à venir/);
  });
});

test('fenêtre « avant » vide dite explicitement ; zéro mesuré distinct de l’absence', async () => {
  await dossier({ ndeg: 'APR-1', statut: 'En cours', responsable: 'Alice Recette' }, 2, [clos(6)]);
  await dossier({ ndeg: 'APR-2', statut: 'En cours', responsable: 'Alice Recette' }, 10, [clos(13)]);
  const m = await mesure();
  assert.equal(m.journal.avant_vide, true); assert.match(m.journal.motif, /l’équipe n’utilisait peut-être pas Radar/);
  assert.equal(m.journal.evenements.avant, 0); assert.equal(m.journal.evenements.apres, 4);
  // Absence : aucun dossier, aucun chiffre, un motif.
  assert.equal(m.avant.duree.n, 0); assert.equal(m.avant.duree.moyenne_jours, null); assert.ok(m.avant.duree.motif);
  assert.equal(m.avant.reouvertures.part, null); assert.equal(m.avant.reouvertures.dossiers_rouverts, null);
  assert.ok(m.avant.reouvertures.motif);
  // Zéro mesuré : deux dossiers, aucune réouverture.
  assert.equal(m.apres.reouvertures.n, 2); assert.equal(m.apres.reouvertures.dossiers_rouverts, 0);
  assert.equal(m.apres.reouvertures.part, 0); assert.equal(m.apres.reouvertures.motif, undefined);
  assert.equal(m.apres.reattributions.evenements, 0); assert.equal(m.apres.echeances.changements, 0);
  assert.equal(m.apres.duree.n, 2); assert.equal(m.apres.duree.moyenne_jours, 3.5);
  // Aucune échéance au format jour : ponctualité absente, pas 0 %.
  assert.equal(m.apres.ponctualite.n, 0); assert.equal(m.apres.ponctualite.taux, null);
  assert.equal(m.apres.ponctualite.non_comptes.sans_echeance_jour, 2);
});

test('durée, ponctualité et dossiers à cheval : chaque dossier dans une seule case', async () => {
  // Avant : ouverts et clos dans [B-30, B).
  await dossier({ ndeg: 'AV-1', statut: 'En cours', deadline: jour(-12) }, -20, [clos(-10)]);          // 10 j, 2 j de retard
  await dossier({ ndeg: 'AV-2', statut: 'En cours', deadline: jour(-20) }, -25, [clos(-22, 'Livré')]); // 3 j, à temps
  // À cheval : ouvert avant la bascule, clos après.
  await dossier({ ndeg: 'CH-1', statut: 'En cours', deadline: jour(5) }, -5, [clos(3)]);
  // Après : ouverts et clos dans [B, B+30).
  await dossier({ ndeg: 'AP-1', statut: 'En cours', deadline: '2026-12' }, 2, [clos(6)]);              // échéance au mois : non comptée
  await dossier({ ndeg: 'AP-2', statut: 'En cours', deadline: jour(14) }, 10, [clos(14, 'Validé')]);   // le jour même : à temps
  await dossier({ ndeg: 'AP-3', statut: 'En cours', deadline: 'S47' }, 15, [clos(18)]);
  // Hors fenêtre, non clos, déjà clos à la création, exclus.
  await dossier({ ndeg: 'HF-1', statut: 'En cours', deadline: jour(-36) }, -40, [clos(-35)]);
  await dossier({ ndeg: 'NC-1', statut: 'En cours' }, -3);
  await dossier({ ndeg: 'NC-2', statut: 'En cours' }, 5);
  await dossier({ ndeg: 'CC-1', statut: 'Bouclé', closed_at: t(-8).toISOString() }, -8);
  await dossier({ ndeg: 'DB-1', statut: 'En cours', entree: 'Doublon' }, -18, [clos(-15)]);
  await dossier({ ndeg: '≈AV-1', statut: 'En cours' }, -18, [clos(-15)]);
  await dossier({ ndeg: 'AR-1', statut: 'En cours' }, -18, [clos(-15, 'Archivé')]);
  const m = await mesure();
  assert.deepEqual(m.dossiers, { avant: 2, apres: 3, a_cheval: 1, hors_fenetre: 1,
    non_clos: { n: 2, ouverts_avant_bascule: 1, ouverts_depuis: 1 }, sans_ouverture: 0, cree_clos: 1, exclus: 3, supprimes: 0 });
  assert.equal(m.journal.avant_vide, false);
  assert.deepEqual(m.avant.duree, { n: 2, moyenne_jours: 6.5, mediane_jours: 6.5, dont_genre_closed: 1 });
  assert.deepEqual(m.apres.duree, { n: 3, moyenne_jours: 3.7, mediane_jours: 4, dont_genre_closed: 0 });
  assert.deepEqual(m.a_cheval.duree, { n: 1, moyenne_jours: 8, mediane_jours: 8, dont_genre_closed: 0 });
  assert.deepEqual(m.avant.ponctualite, { n: 2, a_temps: 1, en_retard: 1, taux: 0.5, retard_moyen_jours: 2,
    non_comptes: { sans_echeance_jour: 0, sans_closed_at: 0 } });
  assert.deepEqual(m.apres.ponctualite, { n: 1, a_temps: 1, en_retard: 0, taux: 1, retard_moyen_jours: null,
    non_comptes: { sans_echeance_jour: 2, sans_closed_at: 0 } });
  assert.equal(m.a_cheval.ponctualite.n, 1); assert.equal(m.a_cheval.ponctualite.a_temps, 1);
});

test('réouvertures, réattributions, échéances et révisions comptent aussi ce que le genre masque', async () => {
  const r1 = await dossier({ ndeg: 'REV-1', statut: 'En cours', responsable: 'Alice Recette', deadline: jour(-20) }, -28, [
    [-26, { responsable: 'Bob Recette' }],                                   // reassigned
    [-25, { deadline: jour(-18) }],                                          // deadline, report
    clos(-24),                                                               // status → Bouclé
    // Réouverture, nouveau responsable et nouvelle échéance dans une seule
    // écriture : le journal ne note qu'un « status ».
    [-22, { statut: 'En cours', responsable: 'Sue Recette', deadline: jour(-15), closed_at: null }],
    clos(-21, 'Livré'),                                                      // closed
  ]);
  await dossier({ ndeg: 'REV-2', statut: 'En cours', deadline: jour(-10) }, -15, [clos(-12)]);
  // Révisions : entrées de code PARENT.RN. La seconde arrive après la fin de la
  // fenêtre de son dossier d'origine ; celle de MAN-404 n'a pas de dossier d'origine.
  await dossier({ ndeg: 'REV-1.R1', statut: 'Reçu', entree: 'Révision', parent: 'REV-1' }, -23);
  await dossier({ ndeg: 'REV-1.R2', statut: 'Reçu', entree: 'Révision', parent: 'REV-1' }, 2);
  await dossier({ ndeg: 'MAN-404.R1', statut: 'Reçu', entree: 'Révision' }, -9);
  const kinds = (await db.query('select kind from task_events where brief_id=$1 order by id', [r1])).rows.map(r => r.kind);
  assert.deepEqual(kinds, ['created', 'reassigned', 'deadline', 'status', 'status', 'closed']);
  const m = await mesure();
  assert.equal(m.dossiers.avant, 2);
  assert.deepEqual(m.avant.duree, { n: 2, moyenne_jours: 5, mediane_jours: 5, dont_genre_closed: 1 });
  assert.deepEqual(m.avant.reouvertures, { n: 2, dossiers_rouverts: 1, evenements: 1, part: 0.5, dont_genre_reopened: 0 });
  assert.deepEqual(m.avant.reattributions, { n: 2, dossiers: 1, evenements: 2, par_dossier: 1, dont_genre_reassigned: 1 });
  assert.deepEqual(m.avant.echeances, { n: 2, dossiers: 1, changements: 2, reports: 2, par_dossier: 1, dont_genre_deadline: 1 });
  assert.deepEqual(m.avant.revisions, { n: 2, revisions: 1, dossiers_revises: 1, par_dossier: 0.5 });
  assert.equal(m.revisions_sans_origine, 1);
  // Ponctualité contre l'échéance finale, comme briefs/sla.html.
  assert.equal(m.avant.ponctualite.a_temps, 2);
});

test('décisions La Barre : par verdict et par projet, datées par quand, non rattachées dites', async () => {
  const av = await dossier({ ndeg: 'D-AV', statut: 'En cours' }, -20, [clos(-10)]);
  const ch = await dossier({ ndeg: 'D-CH', statut: 'En cours' }, -5, [clos(5)]);
  const ap = await dossier({ ndeg: 'D-AP', statut: 'En cours' }, 2, [clos(8)]);
  // Le code ressemble au projet : ce n'est pas une correspondance.
  await dossier({ ndeg: 'P-NON', statut: 'En cours' }, 1, [clos(4)]);
  await correspondance('P-AV', av); await correspondance('P-CH', ch); await correspondance('P-AP', ap);
  await decision('d1', { projet: 'P-AV', quand: t(-15), verdict: 'retour' });
  await decision('d2', { projet: 'P-AV', quand: t(-12), verdict: 'approuve' });
  // `at` dans la fenêtre avant, `quand` dans la fenêtre après : c'est quand qui compte.
  await decision('d3', { projet: 'P-AP', quand: t(3), verdict: 'retour', at: t(-10) });
  await decision('d4', { projet: 'P-AP', quand: t(4), verdict: 'retour' });
  await decision('d5', { projet: 'P-AP', quand: t(6), verdict: 'reserve' });
  await decision('d6', { projet: 'P-CH', quand: t(-2), verdict: 'retour' });
  await decision('d7', { projet: 'P-NON', quand: t(5), verdict: 'hors' });
  await decision('d8', { projet: null, quand: t(-8), verdict: 'approuve' });
  await decision('d9', { projet: 'P-AV', quand: null, quand_declare: 'hier', verdict: 'retour' });
  await decision('d10', { projet: 'P-AP', quand: t(7), verdict: 'approuve' });
  await decision('d10', { projet: 'P-AP', quand: t(7), verdict: 'approuve', version: 2, etat: 'retiree', empreinte: null });
  await decision('d11', { projet: 'P-AV', quand: t(-40), verdict: 'retour' });
  await decision('d12', { projet: 'P-AV', quand: t(-14), verdict: 'refait' });
  const m = await mesure();
  assert.deepEqual(m.avant.barre.decisions, { n: 4, par_verdict: { approuve: 2, reserve: 0, retour: 1, hors: 0, autre: 1 },
    rattachees: 3, non_rattachees: 0, sans_projet: 1, dossier_introuvable: 0 });
  assert.deepEqual(m.avant.barre.retours_par_projet, { n: 1, retours: 1, dossiers_avec_retour: 1, par_dossier: 1 });
  assert.deepEqual(m.apres.barre.decisions, { n: 4, par_verdict: { approuve: 0, reserve: 1, retour: 2, hors: 1, autre: 0 },
    rattachees: 3, non_rattachees: 1, sans_projet: 0, dossier_introuvable: 0 });
  assert.deepEqual(m.apres.barre.retours_par_projet, { n: 1, retours: 2, dossiers_avec_retour: 1, par_dossier: 2 });
  assert.equal(m.a_cheval.barre.decisions.n, 1); assert.equal(m.a_cheval.barre.decisions.par_verdict.retour, 1);
  assert.equal(m.barre.sans_date, 1); assert.equal(m.barre.retirees, 1); assert.equal(m.barre.hors_fenetre, 1);
  assert.match(m.definitions.rattachement, /non rattachée/); assert.match(m.definitions.rattachement, /aucun code/);
  for (const k of ['taux_reprise_versions', 'tours_au_dela_du_vendu']) {
    assert.equal(m.barre.non_calculable[k].valeur, null, k);
    assert.match(m.barre.non_calculable[k].motif, /non calculable depuis Radar/, k);
  }
});

test('périmètre : membre refusé, dossier privé d’autrui et événement à confidentialité inconnue hors de vue', async () => {
  const pub = await dossier({ ndeg: 'PUB-1', statut: 'En cours' }, -20, [clos(-10)]);
  const priv = await dossier({ ndeg: 'PRIV-SECRET', statut: 'En cours', private_to: 'Alice Recette' }, -20, [clos(-10)]);
  // Ancien événement sans confidentialité enregistrée, rattaché au dossier privé.
  await db.query(`insert into task_events(at,brief_id,private_to,ndeg,kind,statut_old,statut_new,resp_old,resp_new,summary)
    values ($1,$2,null,'PRIV-SECRET','reassigned','En cours','En cours','X','Y','ANCIEN_INCONNU')`, [t(-15), priv]);
  // Un autre, sans dossier : lisible des responsables, attribué à personne.
  await db.query("insert into task_events(at,ndeg,kind,summary) values ($1,'LEG-1','created','ANCIEN_SANS_DOSSIER')", [t(-15)]);
  // Un dossier privé d'Alice, supprimé : sa suppression reste hors de vue de Sue.
  const efface = await dossier({ ndeg: 'PRIV-EFFACE', statut: 'En cours', private_to: 'Alice Recette' }, -18, [clos(-16)]);
  const depuis = await maxEvent();
  await db.query('delete from briefs where id=$1', [efface]); await dater(efface, depuis, -14);
  await correspondance('P-PRIV', priv); await correspondance('P-PUB', pub);
  await decision('dp', { projet: 'P-PRIV', quand: t(-15), verdict: 'retour' });
  await decision('dq', { projet: 'P-PUB', quand: t(-15), verdict: 'approuve' });

  const anonyme = await req('/mesure/avant-apres', null);
  assert.equal(anonyme.status, 401);
  const bob = await req('/mesure/avant-apres?jours=30', 'bob');
  assert.equal(bob.status, 403);
  const bobTexte = await bob.text();
  assert.ok(!/PRIV|duree|bascule/.test(bobTexte), bobTexte);

  const sue = await mesure('sue');
  assert.equal(sue.dossiers.avant, 1); assert.equal(sue.dossiers.supprimes, 0);
  assert.equal(sue.avant.reattributions.evenements, 0);
  assert.equal(sue.avant.barre.decisions.n, 1); assert.equal(sue.avant.barre.decisions.par_verdict.retour, 0);
  assert.equal(sue.journal.non_attribues, 1);
  // Activité de la fenêtre : PUB (2) et l'ancien sans dossier (1) ; rien du dossier
  // privé, ni l'événement inconnu qui lui est rattaché.
  assert.equal(sue.journal.evenements.avant, 3);
  assert.equal(sue.perimetre.role, 'supervisor');
  const sueTexte = JSON.stringify(sue);
  for (const secret of ['PRIV-SECRET', 'PRIV-EFFACE', 'ANCIEN_INCONNU', 'Alice Recette']) assert.ok(!sueTexte.includes(secret), secret);

  const alice = await mesure('alice');
  assert.equal(alice.dossiers.avant, 2); assert.equal(alice.dossiers.supprimes, 1);
  assert.equal(alice.avant.reattributions.evenements, 1);
  // PUB 2, PRIV 2 et l'inconnu, l'ancien sans dossier, PRIV-EFFACE 3.
  assert.equal(alice.journal.evenements.avant, 9);
  assert.equal(alice.avant.barre.decisions.n, 2); assert.equal(alice.avant.barre.decisions.par_verdict.retour, 1);

  const machine = await mesure('machine');
  assert.equal(machine.dossiers.avant, 2); assert.equal(machine.avant.reattributions.evenements, 1);
  assert.equal(machine.perimetre.role, 'machine');
});

test('la page de lecture est servie derrière le mur et lit la route', async () => {
  assert.equal((await req('/mesure.html', null)).status, 401);
  const page = await req('/mesure.html', 'sue');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /\/mesure\/avant-apres/);
  assert.match(html, /à cheval/);
});
