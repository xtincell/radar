// Dashboard R26 — Projets + Demandes créatives pages

// Shared page header (title + optional action)
function PageHead({ title, sub, action, actionIcon }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 30, letterSpacing: '-0.01em', color: 'var(--fg1)' }}>{title}</h1>
        {sub && <p style={{ margin: '5px 0 0', fontSize: 14.5, color: 'var(--fg3)' }}>{sub}</p>}
      </div>
      {action && <Button variant="dark" icon={actionIcon || 'plus'} style={{ flexDirection: 'row-reverse' }}>{action}</Button>}
    </header>
  );
}

function FilterChips({ items, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
      {items.map((f) => (
        <button key={f} onClick={() => onChange(f)} style={{
          border: active === f ? 'none' : '1.5px solid var(--border-strong)',
          background: active === f ? 'var(--ink-950)' : 'transparent',
          color: active === f ? '#fff' : 'var(--fg2)',
          padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          transition: 'background var(--dur-fast) var(--ease-out)',
        }}>{f}</button>
      ))}
    </div>
  );
}

// Notre même liste de projets, enrichie des champs Radar (radar-helpers.jsx).
const ALL_PROJECTS = PROJECTS;

function ProjectCard({ p, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <Card
      pad={20}
      style={{ cursor: 'pointer', transform: hover ? 'translateY(-3px)' : 'none', boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-md)', transition: 'transform var(--dur-med) var(--ease-out), box-shadow var(--dur-med) var(--ease-out)' }}
      onClick={onOpen}
    >
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', background: 'var(--paper-100)', padding: '3px 9px', borderRadius: 6 }}>{p.ndeg}</span>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            {isFrozenP(p) && <Chip variant="hatch" style={{ fontSize: 10.5, padding: '3px 9px' }}>Gelé</Chip>}
            <Chip variant={p.prio === 'P0' ? 'solid' : p.prio === 'P1' ? 'soft' : 'outline'} style={{ fontSize: 10.5, padding: '3px 9px' }}>{p.prio}</Chip>
          </span>
        </div>
        <div style={{
          aspectRatio: '16 / 8', borderRadius: 14, marginBottom: 16,
          background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 8px, var(--paper-100) 8px 16px)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>visuel projet</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client), flexShrink: 0 }}></span>
              {p.marque} · {p.type}
            </div>
          </div>
          <Chip variant={p.chip} style={{ fontSize: 11.5, padding: '4px 11px', flexShrink: 0 }}>{p.status}</Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
            <div style={{ width: `${p.pct}%`, height: '100%', borderRadius: 4, background: p.status === 'Terminé' ? 'var(--ink-950)' : 'var(--orange-500)' }}></div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.pct}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Avatar initials={initialsOf(p.responsable)} size={26} tint="var(--orange-200)" />
            <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{p.responsable.split(' ')[0]}</span>
          </span>
          <span style={{ fontSize: 12.5, color: isLateP(p) ? '#B4472E' : 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: isLateP(p) ? 700 : 400 }}>
            <Icon name="calendar" size={13} /> {isLateP(p) ? `+${daysLateP(p)}j` : fmtDateP(p.deadline)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function ProjetsPage() {
  const FILTERS = ['Tous', 'En conception', 'En production', 'En validation', 'Terminé', 'En retard', 'P0'];
  const [filter, setFilter] = useState('Tous');
  const [selected, setSelected] = useState(null);
  const shown = ALL_PROJECTS.filter((p) => {
    if (filter === 'Tous') return true;
    if (filter === 'En retard') return isLateP(p);
    if (filter === 'P0') return p.prio === 'P0';
    return p.status === filter;
  });
  if (selected) return <ProjetDetail p={selected} onBack={() => setSelected(null)} />;
  return (
    <React.Fragment>
      <PageHead title="Projets" sub={`${ALL_PROJECTS.length} projets actifs dans l'agence`} action="Nouveau projet" />
      <FilterChips items={FILTERS} active={filter} onChange={setFilter} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {shown.map((p) => <ProjectCard key={p.title} p={p} onOpen={() => setSelected(p)} />)}
      </div>
    </React.Fragment>
  );
}

// initials from a full name ("Laure Pemha" -> "LP")
function initialsOf(n) { return (n || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

// ---- Demandes créatives (kanban) ----

const DEMANDES = {
  'Nouveau': [
    { title: 'Post Instagram – Produit', by: 'Equipe Marketing', due: '20 juin', kind: 'Social' },
    { title: 'Visuel événement – Conférence', by: 'Communication', due: '24 juin', kind: 'Print' },
  ],
  'En cours': [
    { title: 'Cover LinkedIn – Recrutement', by: 'RH', due: '18 juin', kind: 'Social', who: 'KA' },
    { title: 'Infographie – Étude interne', by: 'Strategy', due: '26 juin', kind: 'Print', who: 'SD' },
    { title: 'Bannières display – Promo', by: 'Equipe Marketing', due: '21 juin', kind: 'Digital', who: 'MB' },
  ],
  'Livré': [
    { title: 'Signature email – Direction', by: 'Communication', due: '10 juin', kind: 'Digital', who: 'LP' },
    { title: 'Roll-up – Salon Emploi', by: 'RH', due: '05 juin', kind: 'Print', who: 'NM' },
  ],
};

function DemandeCard({ d, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <Card pad={16} onClick={onOpen} style={{ boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)', cursor: 'pointer', transform: hover ? 'translateY(-2px)' : 'none', transition: 'transform var(--dur-med) var(--ease-out), box-shadow var(--dur-med) var(--ease-out)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.title}</div>
        <Chip variant="outline" style={{ fontSize: 10.5, padding: '3px 9px', flexShrink: 0 }}>{d.kind}</Chip>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 6 }}>Demandé par : {d.by}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name="clock" size={12} /> {d.due}
        </span>
        {d.who ? <Avatar initials={d.who} size={26} tint="var(--orange-200)" /> : <Chip variant="solid" style={{ fontSize: 10.5, padding: '3px 9px' }}>Nouveau</Chip>}
      </div>
    </Card>
    </div>
  );
}

function DemandesPage() {
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('demandes');
  if (selected) return <DemandeDetail d={selected.d} col={selected.col} onBack={() => setSelected(null)} />;
  const nValider = (window.RETOURS || []).length;
  return (
    <React.Fragment>
      <PageHead
        title="Demandes créatives"
        sub={mode === 'demandes' ? 'Demandes entrantes des autres équipes' : 'Retours clients à confirmer avant insertion dans le pipe'}
        action={mode === 'demandes' ? 'Nouvelle demande' : null}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['demandes', 'Demandes'], ['valider', `À valider${nValider ? ` · ${nValider}` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            border: mode === k ? 'none' : '1.5px solid var(--border-strong)',
            background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {mode === 'valider' ? <AValiderView /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {Object.entries(DEMANDES).map(([col, items]) => (
            <div key={col}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col === 'Nouveau' ? 'var(--orange-500)' : col === 'En cours' ? 'var(--ink-950)' : 'var(--border-strong)' }}></span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{col}</span>
                <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map((d) => <DemandeCard key={d.title} d={d} onOpen={() => setSelected({ d, col })} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { PageHead, FilterChips, ProjetsPage, DemandesPage });
