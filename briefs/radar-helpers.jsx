// Dashboard R26 — Radar enrichment layer.
// SAME projects we already designed — we only ADD Radar fields (ndeg, client,
// marque, statutRadar, prio, responsable, deadline, livrables, entrePar) and
// shared helpers. Nothing is removed; existing fields (title/type/pct/status/
// chip/date/team) are preserved verbatim.

// Deadlines as day-offsets from "today" so "en retard" stays live.
const _TODAY = new Date(new Date().toDateString());
const _iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const _dayFrom = (n) => { const d = new Date(_TODAY); d.setDate(d.getDate() + n); return _iso(d); };

// Status sets — declared before BRIEFS_EXTRA's map, which references DONE_RADAR.
const ACTIVE_RADAR = ['En cours', 'En attente client', 'Reçu', 'Bloqué'];
const CLOSED_RADAR = new Set(['Envoyé dans Slack', 'Livré', 'Validé', 'Bouclé']);
const DONE_RADAR = new Set(['Livré', 'Validé', 'Bouclé', 'Archivé']);
const isFrozenP = (p) => p.statutRadar === 'Gelé';
const isActiveP = (p) => !DONE_RADAR.has(p.statutRadar) && !isFrozenP(p) && p.statutRadar !== 'Envoyé dans Slack';

// DB columns from the real schema (cluster, pays, thread_id, doc_*, private_to)
// layered onto our 6 showcase projects — keyed by ndeg, merged in the map below.
const DB_EXTRA = {
  'PAN-014': { cluster: 'Western', pays: 'Cameroun', threadId: 'slack · #panza-crea', docBrief: 'Brief_PAN014.pdf', docPropal: 'Propal_PAN014.pdf', docLivr: '', privateTo: '', deadlineHard: true },
  'BNR-021': { cluster: 'ESA', pays: 'Cameroun', threadId: 'notion · brief-ramadan', docBrief: 'Brief_BNR021.pdf', docPropal: 'Propal_BNR021.pdf', docLivr: '', privateTo: '', deadlineHard: true, attenteClient: 4 },
  'AGL-007': { cluster: 'Corporate', pays: "Côte d'Ivoire", threadId: 'tracker · AGL-007', docBrief: 'Brief_AGL007.pdf', docPropal: '', docLivr: '', privateTo: '' },
  'PBD-003': { cluster: 'Fintech', pays: 'Cameroun', threadId: 'slack · #payboard', docBrief: 'Brief_PBD003.pdf', docPropal: 'Propal_PBD003.pdf', docLivr: 'Livraison_PBD003.zip', privateTo: '' },
  'BNR-024': { cluster: 'ESA', pays: 'Cameroun', threadId: 'whatsapp · retranscrit', docBrief: '', docPropal: '', docLivr: '', privateTo: '' },
  'AGL-009': { cluster: 'Corporate', pays: "Côte d'Ivoire", threadId: 'ticket · AGL-009', docBrief: 'Brief_AGL009.pdf', docPropal: 'Propal_AGL009.pdf', docLivr: '', privateTo: 'Nelson Metougue', attenteClient: 3 },
};

// Our 6 projects, extended. Titles / pct / team / status / chip / date UNCHANGED.
const PROJECTS = [
  { title: 'Campagne La Pasta – Rentrée 2026', type: 'Campagne 360°', pct: 75, status: 'En production', chip: 'solid', date: '25 juin', team: ['LP', 'KA', 'MB'],
    ndeg: 'PAN-014', client: 'Panza Foods', marque: 'La Pasta', statutRadar: 'En cours', prio: 'P0', responsable: 'Laure Pemha', livrables: 'KV maître · déclinaisons social · OOH', entrePar: 'Coordination', canal: 'Slack', dl: 3, recu: -18 },
  { title: 'Bonnet Rouge – Ramadan 2025', type: 'Campagne Digitale', pct: 60, status: 'En validation', chip: 'outline', date: '18 juin', team: ['SD', 'NM'],
    ndeg: 'BNR-021', client: 'Bonnet Rouge', marque: 'Bonnet Rouge', statutRadar: 'En attente client', prio: 'P1', responsable: 'Sarah Dikongue', livrables: 'Film 30s · carrousel 4:5 · story 9:16', entrePar: 'Direction', canal: 'Notion', dl: 6, recu: -22 },
  { title: 'AGL – Brand Refresh', type: 'Branding', pct: 40, status: 'En conception', chip: 'soft', date: '12 juin', team: ['MB', 'LP', 'SD'],
    ndeg: 'AGL-007', client: 'AGL', marque: 'AGL', statutRadar: 'En cours', prio: 'P1', responsable: 'Marc Biya', livrables: 'Logo · charte · déclinaisons OOH', entrePar: 'Coordination', canal: 'Tracker', dl: 9, recu: -30 },
  { title: 'Payboard – Teaser Launch', type: 'Teaser / Digital', pct: 90, status: 'Terminé', chip: 'ink', date: '05 juin', team: ['NM', 'KA'],
    ndeg: 'PBD-003', client: 'Payboard', marque: 'Payboard', statutRadar: 'Livré', prio: 'P2', responsable: 'Nelson Metougue', livrables: 'Teaser 15s · post produit', entrePar: 'Direction', canal: 'Slack', dl: -6, recu: -40, closed: -4 },
  { title: 'Bonnet Rouge – Bon Matin', type: 'Social / Print', pct: 30, status: 'En conception', chip: 'soft', date: '30 juin', team: ['KA', 'SD'],
    ndeg: 'BNR-024', client: 'Bonnet Rouge', marque: 'Bonnet Rouge', statutRadar: 'Reçu', prio: 'P1', responsable: 'Karim Abanda', livrables: 'Série social · affiche', entrePar: 'Coordination', canal: 'WhatsApp', dl: 12, recu: -4 },
  { title: 'AGL – Film corporate', type: 'Film', pct: 55, status: 'En production', chip: 'solid', date: '02 juil.', team: ['LP', 'NM', 'MB'],
    ndeg: 'AGL-009', client: 'AGL', marque: 'AGL', statutRadar: 'En cours', prio: 'P1', responsable: 'Laure Pemha', livrables: 'Film 90s · sous-titrage', entrePar: 'Coordination', canal: 'Ticket', dl: -2, recu: -25 },
].map((p) => ({ ...p, ...(DB_EXTRA[p.ndeg] || {}), deadline: _dayFrom(p.dl), date_recu: _dayFrom(p.recu), closedAt: p.closed != null ? _dayFrom(p.closed) : '' }));

// Additional briefs (NOT our showcase projects) — give the Radar views enough
// material: frozen dossiers, closed/archived history, more pipe entries.
// These never appear in Projets/Overview cards; they feed Entrées, Gantt,
// Gelés, Historique. ALL_BRIEFS = PROJECTS + these.
const BRIEFS_EXTRA = [
  { ndeg: 'PAN-016', title: 'La Pasta – Recette du mois', client: 'Panza Foods', marque: 'La Pasta', type: 'Social', statutRadar: 'Bloqué', prio: 'P0', responsable: 'Karim Abanda', livrables: 'Carrousel recette', entrePar: 'Coordination', canal: 'Slack', dl: -1, recu: -10 },
  { ndeg: 'CAC-002', title: 'Choco Sud – Lancement tablette', client: 'Cacao Sud', marque: 'Choco Sud', type: 'Campagne 360°', statutRadar: 'En attente client', prio: 'P1', responsable: 'Sarah Dikongue', livrables: 'KV · packaging · social', entrePar: 'Direction', canal: 'Notion', dl: 4, recu: -15 },
  { ndeg: 'WOU-005', title: 'Malta Wouri – Été', client: 'Wouri Brasserie', marque: 'Malta Wouri', type: 'Campagne Digitale', statutRadar: 'En cours', prio: 'P2', responsable: 'Marc Biya', livrables: 'Spot · social · display', entrePar: 'Coordination', canal: 'Tracker', dl: 8, recu: -20 },
  { ndeg: 'PAN-017', title: 'La Pasta – Activation retail', client: 'Panza Foods', marque: 'La Pasta', type: 'Print / PLV', statutRadar: 'En cours', prio: 'P1', responsable: 'Karim Abanda', livrables: 'PLV · stop-rayon · leaflet', entrePar: 'Coordination', canal: 'Slack', dl: -3, recu: -28 },
  { ndeg: 'PAN-018', title: 'La Pasta – Spot TV 20s', client: 'Panza Foods', marque: 'La Pasta', type: 'Film', statutRadar: 'Bloqué', prio: 'P1', responsable: 'Laure Pemha', livrables: 'Spot 20s · versions langues', entrePar: 'Direction', canal: 'Ticket', dl: -4, recu: -26 },
  { ndeg: 'PBD-004', title: 'Payboard – Landing produit', client: 'Payboard', marque: 'Payboard', type: 'Digital', statutRadar: 'En cours', prio: 'P1', responsable: 'Nelson Metougue', livrables: 'Maquette landing · assets', entrePar: 'Direction', canal: 'Lien', dl: 2, recu: -16 },
  { ndeg: 'CAC-003', title: 'Choco Sud – Story Ramadan', client: 'Cacao Sud', marque: 'Choco Sud', type: 'Social', statutRadar: 'Reçu', prio: 'P1', responsable: 'Karim Abanda', livrables: 'Série story 9:16', entrePar: 'Coordination', canal: 'WhatsApp', dl: 7, recu: -2 },
  { ndeg: 'AGL-010', title: 'AGL – Signalétique entrepôt', client: 'AGL', marque: 'AGL', type: 'Print', statutRadar: 'En attente client', prio: 'P2', responsable: 'Marc Biya', livrables: 'Panneaux · pictos', entrePar: 'Coordination', canal: 'Notion', dl: 5, recu: -14 },
  { ndeg: 'BNR-026', title: 'Bonnet Rouge – Packaging refonte', client: 'Bonnet Rouge', marque: 'Bonnet Rouge', type: 'Packaging', statutRadar: 'En cours', prio: 'P0', responsable: 'Sarah Dikongue', livrables: 'Design pack · déclinaisons SKU', entrePar: 'Direction', canal: 'Slack', dl: 10, recu: -6 },
  // --- gelés ---
  { ndeg: 'EBU-001', title: 'Éburnéa – Identité', client: 'Éburnéa', marque: 'Éburnéa', type: 'Branding', statutRadar: 'Gelé', prio: 'P2', responsable: 'Nelson Metougue', livrables: 'Logo · système visuel', entrePar: 'Direction', canal: 'Notion', dl: 20, recu: -35, comm: 'Budget client en pause, en attente de reprise.' },
  { ndeg: 'WOU-004', title: 'Malta Wouri – Refonte site', client: 'Wouri Brasserie', marque: 'Malta Wouri', type: 'Digital', statutRadar: 'Gelé', prio: 'P2', responsable: '', livrables: 'Maquettes · CMS', entrePar: 'Coordination', canal: 'Tracker', dl: 30, recu: -50, comm: 'Sans nouvelle du client depuis 6 semaines.' },
  { ndeg: 'CAC-001', title: 'Choco Sud – Refonte logo', client: 'Cacao Sud', marque: 'Choco Sud', type: 'Branding', statutRadar: 'Gelé', prio: 'P1', responsable: 'Marc Biya', livrables: 'Logo · charte', entrePar: 'Direction', canal: 'Slack', dl: 15, recu: -60, comm: 'Décision interne repoussée après réorganisation.' },
  // --- clôturés / historique ---
  { ndeg: 'PBD-002', title: 'Payboard – Kit réseaux', client: 'Payboard', marque: 'Payboard', type: 'Social', statutRadar: 'Bouclé', prio: 'P2', responsable: 'Karim Abanda', livrables: 'Templates social', entrePar: 'Direction', canal: 'Slack', dl: -15, recu: -45, closed: -12 },
  { ndeg: 'AGL-006', title: 'AGL – Rapport annuel', client: 'AGL', marque: 'AGL', type: 'Édition', statutRadar: 'Validé', prio: 'P2', responsable: 'Nelson Metougue', livrables: 'Rapport 48p', entrePar: 'Direction', canal: 'Notion', dl: -20, recu: -70, closed: -18 },
  { ndeg: 'WOU-006', title: 'Malta Wouri – Sponsoring', client: 'Wouri Brasserie', marque: 'Malta Wouri', type: 'Print', statutRadar: 'Bouclé', prio: 'P2', responsable: 'Marc Biya', livrables: 'Habillage stade', entrePar: 'Coordination', canal: 'Ticket', dl: -8, recu: -30, closed: -8 },
  { ndeg: 'BNR-020', title: 'Bonnet Rouge – Vœux 2025', client: 'Bonnet Rouge', marque: 'Bonnet Rouge', type: 'Social / Film', statutRadar: 'Livré', prio: 'P1', responsable: 'Sarah Dikongue', livrables: 'Carte animée · post', entrePar: 'Direction', canal: 'Slack', dl: -35, recu: -55, closed: -33 },
  { ndeg: 'PAN-013', title: 'La Pasta – Été gourmand', client: 'Panza Foods', marque: 'La Pasta', type: 'Campagne Digitale', statutRadar: 'Bouclé', prio: 'P1', responsable: 'Laure Pemha', livrables: 'KV · social · display', entrePar: 'Coordination', canal: 'Tracker', dl: -50, recu: -80, closed: -46 },
  { ndeg: 'CAC-000', title: 'Choco Sud – Étude packaging', client: 'Cacao Sud', marque: 'Choco Sud', type: 'Print', statutRadar: 'Archivé', prio: 'P2', responsable: 'Marc Biya', livrables: 'Benchmark · reco', entrePar: 'Direction', canal: 'Notion', dl: -60, recu: -95, closed: -58 },
].map((p) => ({
  status: '—', chip: 'outline', pct: DONE_RADAR.has(p.statutRadar) ? 100 : 0, team: [],
  ...p, deadline: _dayFrom(p.dl), date_recu: _dayFrom(p.recu), closedAt: p.closed != null ? _dayFrom(p.closed) : '',
}));

const ALL_BRIEFS = [...PROJECTS, ...BRIEFS_EXTRA];

// Client colours (for dots) — invented brands stay original.
const CLIENT_COL = {
  'Panza Foods': 'var(--orange-500)', 'Bonnet Rouge': '#B4472E', 'AGL': '#2A6FA8', 'Payboard': '#7A2E86',
  'Cacao Sud': '#8A5A2B', 'Wouri Brasserie': '#C99A5B', 'Éburnéa': '#1F8A5B',
};
const clientColOf = (c) => CLIENT_COL[c] || 'var(--border-strong)';

// Status colours — OUR four display statuses + the Radar vocabulary, harmonised.
const STATUT_COL = {
  'En conception': '#E9C39A', 'En production': 'var(--orange-500)', 'En validation': '#C99A5B', 'Terminé': 'var(--ink-950)',
  'Reçu': '#E9C39A', 'En cours': 'var(--orange-500)', 'En attente client': '#C99A5B', 'Bloqué': '#B4472E',
  'Envoyé dans Slack': '#7A2E86', 'Livré': '#1F8A5B', 'Validé': '#1F8A5B', 'Bouclé': 'var(--ink-950)',
  'Gelé': '#6FA1B8', 'Archivé': 'var(--border-strong)',
};

const isLateP = (p) => !DONE_RADAR.has(p.statutRadar) && !isFrozenP(p) && new Date(p.deadline) < _TODAY;
const daysLateP = (p) => Math.round((_TODAY - new Date(p.deadline)) / 864e5);
const fmtDateP = (isoStr) => new Date(isoStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const initialsFromName = (n) => (n || '').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const firstNameOf = (n) => ((n || '').split(/\s+/)[0] || '').trim();
const TEAM_BASE = ['Nelson Metougue', 'Laure Pemha', 'Karim Abanda', 'Sarah Dikongue', 'Marc Biya'];

// Délais réalistes (étalon agence) — durée standard par type de livrable (cf. ui.js/leadBenchmark).
// Réaliste = réception + étalon + 5 j ouvrés de marge agence. Tension du délai EXIGÉ vs l'étalon :
// 'unfair' = échéance plus courte que la durée étalon → retard imputable au demandeur, pas à la créa.
const ETALON_BY_TYPE = {
  'Campagne 360°': 24, 'Campagne Digitale': 16, 'Branding': 24, 'Teaser / Digital': 10,
  'Social / Print': 8, 'Film': 21, 'Social': 5, 'Print / PLV': 12, 'Digital': 10,
  'Packaging': 15, 'Édition': 18, 'Print': 8, 'Social / Film': 12,
};
const etalonOfP = (p) => ETALON_BY_TYPE[p.type] ?? 10;
const _addDaysISO = (iso, n) => { if (!/^\d{4}/.test(iso || '')) return ''; const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return _iso(d); };
const _addWorkDaysISO = (iso, n) => { if (!/^\d{4}/.test(iso || '')) return ''; const d = new Date(iso + 'T00:00:00'); let a = 0; while (a < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) a++; } return _iso(d); };
const etalonDateP = (p) => _addDaysISO(p.date_recu, etalonOfP(p));
const realisticDateP = (p) => _addWorkDaysISO(etalonDateP(p), 5);
const tensionP = (p) => {
  const real = realisticDateP(p);
  if (!p.deadline || !real) return 'none';
  if (p.deadline >= real) return 'fair';
  if (p.deadline >= etalonDateP(p)) return 'tight';
  return 'unfair';
};

function urgencyP(p) {
  if (isLateP(p)) return { tag: 'late', rank: 0, label: 'En retard' };
  if (p.statutRadar === 'Bloqué') return { tag: 'block', rank: 1, label: 'Bloqué' };
  if (p.prio === 'P0') return { tag: 'p0', rank: 2, label: 'P0' };
  if (p.statutRadar === 'En attente client') return { tag: 'wait', rank: 3, label: 'Attente client' };
  if (p.prio === 'P1') return { tag: 'p1', rank: 4, label: 'P1' };
  return { tag: 'normal', rank: 5, label: '' };
}

Object.assign(window, {
  PROJECTS, ALL_BRIEFS, BRIEFS_EXTRA, CLIENT_COL, clientColOf, STATUT_COL, ACTIVE_RADAR, CLOSED_RADAR, DONE_RADAR,
  isFrozenP, isActiveP, isLateP, daysLateP, fmtDateP, urgencyP, initialsFromName, firstNameOf, TEAM_BASE, RADAR_TODAY: _TODAY,
  ETALON_BY_TYPE, etalonOfP, etalonDateP, realisticDateP, tensionP,
});
