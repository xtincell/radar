// Dashboard R26 — App shell: dark sidebar + scrolling main content (main layout)
// Adapté au Radar : routage par hash (#/slug), atterrissage par rôle
// (owner → Direction · supervisor → Vue d'ensemble · member → Ma journée,
// cf. NOTE_INTEGRATION_BACKEND §7), identité chargée depuis /profil.

function EmptyView({ title }) {
  return (
    <Card tone="cream" style={{ minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <span style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="layout-dashboard" size={30} color="var(--orange-500)" />
      </span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24 }}>{title}</div>
        <div style={{ fontSize: 15, color: 'var(--fg3)', marginTop: 6, maxWidth: 360 }}>Cette vue arrive bientôt — son backend n'existe pas encore.</div>
      </div>
      <Button variant="primary" icon="arrow-up-right" onClick={() => window.appNavigate && window.appNavigate("Vue d'ensemble")}>Vue d'ensemble</Button>
    </Card>
  );
}

function OverviewPage({ ident }) {
  return (
    <React.Fragment>
      <Header name={ident ? firstNameOf(ident.person || '') : ''} />
      <StatStrip />
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20, marginBottom: 20 }}>
        <ProjectProgressCard />
        <RecentProjectsCard />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3.5fr 3.5fr', gap: 20, marginBottom: 20 }}>
        <AtraiterCard />
        <OverviewPipelineCard />
        <OverviewChargeClientCard />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr 4fr', gap: 20, marginBottom: 20 }}>
        <PriorityTasksCard />
        <CalendarCard />
        <RequestsCard />
      </div>
      <RecentWorksCard />
    </React.Fragment>
  );
}

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 920);
  useEffect(() => {
    const on = () => setM(window.innerWidth < 920);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return m;
}

/* ---- routage par hash : #/slug ↔ libellé de vue ---- */
const ROUTES = {
  'vue-densemble': "Vue d'ensemble",
  'direction': 'Direction',
  'rapports': 'Rapports',
  'ma-journee': 'Ma journée',
  'projets': 'Projets',
  'taches': 'Tâches',
  'planning': 'Planning',
  'etalons': 'Étalons',
  'calendrier': 'Calendrier',
  'gabarits': 'Gabarits',
  'livraison': 'Livraison',
  'ticket': 'Nouveau ticket',
  'demandes': 'Demandes créatives',
  'entrees': 'Entrées',
  'geles': 'Gelés',
  'historique': 'Historique',
  'ressources': 'Ressources',
  'equipe': 'Équipe',
  'studio': 'Studio',
  'bibliotheque': 'Bibliothèque',
  'wiki': 'Wiki',
};
const SLUG_OF = Object.fromEntries(Object.entries(ROUTES).map(([s, l]) => [l, s]));
const labelFromHash = () => ROUTES[(location.hash || '').replace(/^#\/?/, '').toLowerCase()] || null;

// Atterrissage : hash > préférence perso (radar:landing, valeurs historiques
// *.html converties) > rôle. Défaut provisoire avant la réponse de /profil.
const LEGACY_LANDING = { 'direction.html': 'Direction', 'radar.html': "Vue d'ensemble", 'todo.html': 'Ma journée' };
const ROLE_LANDING = { owner: 'Direction', supervisor: "Vue d'ensemble", member: 'Ma journée' };
function landingPref() {
  try {
    const v = localStorage.getItem('radar:landing') || '';
    if (!v) return null;
    if (LEGACY_LANDING[v]) return LEGACY_LANDING[v];
    return Object.values(ROUTES).includes(v) ? v : null;
  } catch (e) { return null; }
}

function App() {
  const [nav, setNavState] = useState(() => labelFromHash() || landingPref() || "Vue d'ensemble");
  const [ident, setIdent] = useState(null);
  const [dataV, setDataV] = useState(0);
  const navTouched = useRef(Boolean(labelFromHash() || landingPref()));
  const isMobile = useIsMobile();
  const [navOpen, setNavOpen] = useState(false);

  const setNav = (label) => {
    navTouched.current = true;
    setNavState(label);
    const slug = SLUG_OF[label];
    if (slug && location.hash !== '#/' + slug) location.hash = '#/' + slug;
  };

  // refresh lucide icons after every render
  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  // navigation programmatique (modale brief → dossier Gabarits, header → ticket…)
  window.appNavigate = setNav;

  // hash ↔ état (boutons précédent/suivant, liens profonds)
  useEffect(() => {
    const onHash = () => { const l = labelFromHash(); if (l) { navTouched.current = true; setNavState(l); } };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // données réelles : live-data.jsx remplace les données de démo du kit puis
  // émet 'radar:data' — on remonte la vue courante pour re-calculer ses dérivés
  useEffect(() => {
    const onData = () => setDataV((v) => v + 1);
    window.addEventListener('radar:data', onData);
    if (window.__loadLiveData) window.__loadLiveData();
    return () => window.removeEventListener('radar:data', onData);
  }, []);

  // identité réelle : /profil (middleware Basic) → { ok, role, person, email }
  useEffect(() => {
    let dead = false;
    fetch('/profil', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (dead || !d || !d.ok) return;
        setIdent(d);
        window.MTG_IDENTITY = d;
        if (!navTouched.current && ROLE_LANDING[d.role]) setNavState(ROLE_LANDING[d.role]);
      })
      .catch(() => {});
    return () => { dead = true; };
  }, []);

  const PAGES = {
    "Vue d'ensemble": OverviewPage,
    'Direction': typeof DirectionPage !== 'undefined' && DirectionPage,
    'Projets': typeof ProjetsPage !== 'undefined' && ProjetsPage,
    'Nouveau ticket': typeof TicketPage !== 'undefined' && TicketPage,
    'Gabarits': typeof GabaritsPage !== 'undefined' && GabaritsPage,
    'Livraison': typeof LivraisonPage !== 'undefined' && LivraisonPage,
    'Ma journée': typeof MaJourneePage !== 'undefined' && MaJourneePage,
    'Planning': typeof GanttPage !== 'undefined' && GanttPage,
    'Étalons': typeof EtalonsPage !== 'undefined' && EtalonsPage,
    'Demandes créatives': typeof DemandesPage !== 'undefined' && DemandesPage,
    'Tâches': typeof TachesPage !== 'undefined' && TachesPage,
    'Entrées': typeof EntreesPage !== 'undefined' && EntreesPage,
    'Calendrier': typeof CalendrierPage !== 'undefined' && CalendrierPage,
    'Ressources': typeof RessourcesPage !== 'undefined' && RessourcesPage,
    'Gelés': typeof GelesPage !== 'undefined' && GelesPage,
    'Bibliothèque': typeof BibliothequePage !== 'undefined' && BibliothequePage,
    'Studio': typeof StudioPage !== 'undefined' && StudioPage,
    'Équipe': typeof EquipePage !== 'undefined' && EquipePage,
    'Rapports': typeof RapportsPage !== 'undefined' && RapportsPage,
    'Historique': typeof HistoriquePage !== 'undefined' && HistoriquePage,
    'Wiki': typeof WikiPage !== 'undefined' && WikiPage,
  };
  const PageComp = PAGES[nav];
  const Page = PageComp ? PageComp : () => <EmptyView title={nav} />;

  const go = (label) => { setNav(label); setNavOpen(false); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, var(--paper-50) 0%, var(--bg-app-warm) 100%)' }}>
      {isMobile ? (
        <React.Fragment>
          <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 110, height: 58, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--ink-950)', color: '#fff' }}>
            <button onClick={() => setNavOpen(true)} aria-label="Ouvrir le menu" style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="menu" size={19} />
            </button>
            <img src="assets/logo/mark.svg" alt="" width="30" height="30" style={{ borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nav}</span>
            <span style={{ position: 'relative', display: 'inline-flex', marginRight: 4 }}>
              <Icon name="bell" size={18} color="rgba(255,255,255,0.7)" />
            </span>
          </header>
          {navOpen && (
            <React.Fragment>
              <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,14,8,0.5)' }}></div>
              <Sidebar active={nav} onNavigate={go} mobile onClose={() => setNavOpen(false)} ident={ident} />
            </React.Fragment>
          )}
        </React.Fragment>
      ) : (
        <Sidebar active={nav} onNavigate={go} ident={ident} />
      )}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '74px 14px 46px' : '26px 30px 40px' }}>
        <Page key={nav + ':' + dataV} ident={ident} />
      </main>
      {window.__DATA_MODE === 'demo' && (
        <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink-950)', color: '#F7F2EA', borderRadius: 'var(--radius-pill)', padding: '8px 15px', fontSize: 12, fontWeight: 600, boxShadow: 'var(--shadow-lg)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C99A5B' }}></span>
          Données de démonstration — base injoignable
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
