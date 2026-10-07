// Dashboard R26 — dark left sidebar (main layout chrome)
// Adapté au Radar : marque Le Radar, identité réelle (/profil) dans le pied,
// favoris masqués tant qu'aucune source de données ne les alimente.

const SIDEBAR_GROUPS = [
  { group: 'Pilotage', items: [
    { label: "Vue d'ensemble", icon: 'layout-grid' },
    { label: 'Direction', icon: 'compass' },
    { label: 'Rapports', icon: 'bar-chart-3' },
  ]},
  { group: 'Production', items: [
    { label: 'Ma journée', icon: 'sun' },
    { label: 'Projets', icon: 'folder' },
    { label: 'Tâches', icon: 'check-square' },
    { label: 'Planning', icon: 'gantt-chart' },
    { label: 'Étalons', icon: 'timer' },
    { label: 'Calendrier', icon: 'calendar' },
    { label: 'Gabarits', icon: 'layout-template' },
    { label: 'Livraison', icon: 'package-check' },
  ]},
  { group: 'Flux', items: [
    { label: 'Nouveau ticket', icon: 'ticket' },
    { label: 'Demandes créatives', icon: 'sparkles' },
    { label: 'Entrées', icon: 'inbox' },
    { label: 'Gelés', icon: 'snowflake' },
    { label: 'Historique', icon: 'archive' },
  ]},
  { group: 'Équipe & référentiel', items: [
    { label: 'Ressources', icon: 'users' },
    { label: 'Équipe', icon: 'contact' },
    { label: 'Studio', icon: 'library' },
    { label: 'Wiki', icon: 'book-open' },
  ]},
];

// Favoris : alimentés plus tard (dossiers épinglés) — la section n'apparaît
// que si l'app fournit window.__FAVS.
const SIDEBAR_FAVS = () => (window.__FAVS || []);

const ROLE_LABELS = { owner: 'accès total', supervisor: 'toutes les tâches', member: 'mes tâches' };

function SideItem({ label, icon, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: '8px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderRadius: 12, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: active ? 700 : 500,
        background: active ? 'rgba(255,106,20,0.14)' : hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? 'var(--orange-500)' : 'rgba(255,255,255,0.72)',
        position: 'relative',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)',
      }}
    >
      {active && <span style={{ position: 'absolute', left: -14, top: 6, bottom: 6, width: 4, borderRadius: 4, background: 'var(--orange-500)' }}></span>}
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </button>
  );
}

function FavItem({ label }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '8px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderRadius: 12, fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
        background: hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: 'rgba(255,255,255,0.6)',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="folder" size={12} />
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function Sidebar({ active, onNavigate, mobile, onClose, ident }) {
  const favs = SIDEBAR_FAVS();
  const who = ident && (ident.person || ident.email);
  const role = ident && (ROLE_LABELS[ident.role] || ident.role);
  return (
    <aside style={{
      width: mobile ? 278 : 248, flexShrink: 0, background: 'var(--ink-950)', color: 'var(--fg-on-dark)',
      display: 'flex', flexDirection: 'column', padding: '22px 14px',
      position: mobile ? 'fixed' : 'sticky', top: 0, left: 0, height: mobile ? '100dvh' : '100vh', overflowY: 'auto',
      zIndex: mobile ? 130 : 'auto', boxShadow: mobile ? 'var(--shadow-lg)' : 'none',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px', marginBottom: 26 }}>
        <img src="assets/logo/mark.svg" alt="" width="38" height="38" style={{ borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: 0.2 }}>Le Radar</div>
          <div className="r26-label" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>AGENCE</div>
        </div>
        {mobile && (
          <button onClick={onClose} aria-label="Fermer le menu" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SIDEBAR_GROUPS.map((g, gi) => (
          <React.Fragment key={g.group}>
            <div className="r26-label" style={{ color: 'rgba(255,255,255,0.34)', padding: '0 14px', margin: gi === 0 ? '0 0 5px' : '16px 0 5px', fontSize: 10 }}>{g.group}</div>
            {g.items.map((it) => (
              <SideItem key={it.label} {...it} active={active === it.label} onClick={() => onNavigate(it.label)} />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {favs.length > 0 && (
        <React.Fragment>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 8px' }}></div>
          <div className="r26-label" style={{ color: 'rgba(255,255,255,0.38)', padding: '0 14px', marginBottom: 6, fontSize: 10 }}>Favoris</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {favs.map((f) => <FavItem key={f} label={f} />)}
          </div>
        </React.Fragment>
      )}

      {/* User footer — identité réelle chargée depuis /profil */}
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Avatar initials={who ? initialsFromName(who) : '?'} size={38} tint="var(--orange-200)" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who || 'Connexion…'}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{role || '—'}</div>
          </div>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Icon name="bell" size={17} color="rgba(255,255,255,0.6)" />
          </span>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
