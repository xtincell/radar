// Dashboard R26 × Radar — branchement des données réelles.
// La maquette expose ses données sur window (PROJECTS, ALL_BRIEFS, GABARIT_DATA,
// TEAM, TEAM_BASE) ; cette couche les REMPLACE par les lignes de la base via
// supa.js (loadBriefsLive : déjà filtrées par rôle + private_to côté client,
// RLS côté serveur). Mutation EN PLACE des tableaux : les références capturées
// par les pages au chargement restent valides ; l'app re-rend sur 'radar:data'.
// Si l'API est injoignable (dev statique, base en pause), les données de
// démonstration du kit restent affichées et __DATA_MODE passe à 'demo'.

(function () {
  // vocabulaire legacy → vocabulaire du kit
  const STATUT_ALIAS = { 'Frozen': 'Gelé', 'Livré (cycle)': 'Livré' };

  // statut Radar → statut d'affichage des cartes kit (status/chip)
  function displayOf(statut) {
    switch (statut) {
      case 'Reçu': return { status: 'En conception', chip: 'soft' };
      case 'En cours': return { status: 'En production', chip: 'solid' };
      case 'En attente client': return { status: 'En validation', chip: 'outline' };
      case 'Bloqué': return { status: 'Bloqué', chip: 'outline' };
      case 'Livré': case 'Validé': case 'Bouclé': case 'Envoyé dans Slack':
        return { status: 'Terminé', chip: 'ink' };
      case 'Gelé': return { status: 'Gelé', chip: 'hatch' };
      default: return { status: statut || '—', chip: 'outline' };
    }
  }

  function canalOf(r) {
    const t = (r.threadId || '').toLowerCase();
    if (t.startsWith('slack')) return 'Slack';
    if (t.startsWith('notion')) return 'Notion';
    if (t.startsWith('tracker')) return 'Tracker';
    if (t.startsWith('ticket')) return 'Ticket';
    if (t.startsWith('whatsapp')) return 'WhatsApp';
    if (t.startsWith('http') || t.startsWith('lien')) return 'Lien';
    return r.threadId ? 'Lien' : '—';
  }

  function pctOf(r, statut) {
    const m = /(\d+)/.exec(String(r.avancement || ''));
    if (m) return Math.max(0, Math.min(100, +m[1]));
    return (typeof DONE_RADAR !== 'undefined' && DONE_RADAR.has(statut)) ? 100 : 0;
  }

  const iso = (s) => (/^\d{4}-\d{2}-\d{2}/.test(String(s || '')) ? String(s).slice(0, 10) : '');

  function mapRow(r) {
    const statut = STATUT_ALIAS[r.statut] || r.statut || '';
    const disp = displayOf(statut);
    const team = String(r.responsable || '')
      .split(/[,/&+]| et /).map((s) => s.trim()).filter(Boolean)
      .map((n) => initialsFromName(n));
    return {
      id: r.id,
      ndeg: r.ndeg, title: r.projet || r.livrables || '(sans titre)',
      client: r.client || '—', marque: r.marque || r.client || '—',
      cluster: r.cluster || '', pays: r.pays || '',
      type: r.type || '', niveau: r.niveau || '', entree: r.entree || '', parent: r.parent || '',
      statutRadar: statut, status: disp.status, chip: disp.chip,
      prio: r.prio || 'P2', responsable: r.responsable || '', team,
      livrables: r.livrables || '', entrePar: r.entrePar || '',
      deadline: iso(r.deadline), date_recu: iso(r.date) || iso(r.createdAt), closedAt: iso(r.closedAt),
      date: iso(r.deadline) ? fmtDateP(iso(r.deadline)) : '—',
      pct: pctOf(r, statut),
      deadlineHard: !!r.deadlineHard, attenteClient: 0,
      threadId: r.threadId || '', canal: canalOf(r),
      docBrief: r.docBrief || '', docPropal: r.docPropal || '', docLivr: r.docLivr || '',
      privateTo: r.privateTo || '', comm: r.comm || '', briefEtat: r.briefEtat || '',
    };
  }

  function hasContent(o) { return o && typeof o === 'object' && Object.keys(o).length > 0; }

  // couleurs client : palette stable dérivée du nom quand la config n'en donne pas
  const HUES = ['#B4472E', '#2A6FA8', '#7A2E86', '#8A5A2B', '#C99A5B', '#1F8A5B', '#6FA1B8', '#C2440A'];
  function colorFor(name, i) { return i === 0 ? 'var(--orange-500)' : HUES[(name.length + i) % HUES.length]; }

  async function __loadLiveData() {
    if (!window.loadBriefsLive) { window.__DATA_MODE = 'demo'; return; }
    const kitStatutCol = Object.assign({}, window.STATUT_COL);   // la peau du kit prime sur app_config
    let rows = null;
    try { rows = await window.loadBriefsLive(); } catch (e) { console.error('[live-data]', e); }
    window.STATUT_COL = Object.assign({}, window.STATUT_COL, kitStatutCol);
    if (!Array.isArray(rows) || window.SUPA_SOURCE === 'vide') {
      window.__DATA_MODE = 'demo';
      window.dispatchEvent(new Event('radar:data'));
      return;
    }
    window.__DATA_MODE = 'live';
    const mapped = rows.map(mapRow);

    // ALL_BRIEFS = tout ; PROJECTS = projets maîtres (repli : tout, si la base est plate)
    const masters = mapped.filter((b) => b.entree === 'Maître' || (!b.parent && b.niveau !== 'Tâche'));
    ALL_BRIEFS.length = 0; ALL_BRIEFS.push(...mapped);
    PROJECTS.length = 0; PROJECTS.push(...(masters.length ? masters : mapped));
    BRIEFS_EXTRA.length = 0; BRIEFS_EXTRA.push(...mapped.filter((b) => !PROJECTS.includes(b)));

    // couleurs client : garde la palette du kit pour les noms connus, dérive le reste
    const clients = [...new Set(mapped.map((b) => b.client).filter(Boolean))];
    clients.forEach((c, i) => { if (!CLIENT_COL[c]) CLIENT_COL[c] = colorFor(c, i); });

    // dossiers Gabarits : les blobs jsonb voyagent avec la ligne
    Object.keys(GABARIT_DATA).forEach((k) => delete GABARIT_DATA[k]);
    rows.forEach((r) => {
      const vols = { suivi: r.suivi, client: r.briefClient, crea: r.briefCreatif, prod: r.briefProduction, cs: r.caseStudy };
      if (Object.values(vols).some(hasContent)) {
        GABARIT_DATA[r.ndeg] = { suivi: vols.suivi || {}, client: vols.client || {}, crea: vols.crea || {}, prod: vols.prod || {}, cs: vols.cs || {} };
      }
    });

    // équipe : la config (app_config.team) a rempli TEAM_BASE via loadConfig ;
    // TEAM (vue Équipe/Ressources) se reconstruit sur la charge réelle
    const base = window.TEAM_BASE || [];
    const actifs = mapped.filter(isActiveP);
    TEAM.length = 0;
    TEAM.push(...base.map((name, i) => {
      const mine = actifs.filter((b) => (b.responsable || '').includes(name));
      return { name, role: '', init: initialsFromName(name), load: Math.min(100, mine.length * 20), projects: mine.length };
    }));

    window.dispatchEvent(new Event('radar:data'));
  }

  window.__loadLiveData = __loadLiveData;
})();
