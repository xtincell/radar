// Dashboard R26 — main layout, row 1: project-progress donut + recent projects

const DONUT_DATA = [
  { label: 'En conception', n: 7, pct: 50, color: 'var(--orange-500)' },
  { label: 'En production', n: 4, pct: 29, color: 'var(--ink-950)' },
  { label: 'En validation', n: 2, pct: 14, color: 'var(--orange-200)' },
  { label: 'Terminés', n: 1, pct: 7, color: 'var(--border-strong)' },
];

function Donut({ size = 170, stroke = 30 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      {DONUT_DATA.map((d) => {
        const len = (d.pct / 100) * c;
        const el = (
          <circle
            key={d.label}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${Math.max(len - 4, 2)} ${c - Math.max(len - 4, 2)}`}
            strokeDashoffset={-offset} strokeLinecap="round"
          ></circle>
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function ProjectProgressCard() {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <CardHead title="Avancement des projets" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, flex: 1 }}>
        <Donut />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
          {DONUT_DATA.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }}></span>
              <span style={{ flex: 1, color: 'var(--fg2)' }}>{d.label}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.n}</span>
              <span style={{ color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums', width: 44, textAlign: 'right' }}>({d.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
      <button style={{ marginTop: 18, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--fg1)', padding: 0 }}>
        Voir tous les projets <Icon name="arrow-right" size={15} />
      </button>
    </Card>
  );
}

// ---- Recent projects ----

const RECENT_PROJECTS = [
  { title: 'Campagne La Pasta – Rentrée 2026', sub: 'Campagne 360°', pct: 75, status: 'En production', chip: 'solid', date: '25 juin', team: ['LP', 'KA', 'MB'] },
  { title: 'Bonnet Rouge – Ramadan 2025', sub: 'Campagne Digitale', pct: 60, status: 'En validation', chip: 'outline', date: '18 juin', team: ['SD', 'NM', 'KA'] },
  { title: 'AGL – Brand Refresh', sub: 'Branding', pct: 40, status: 'En conception', chip: 'soft', date: '12 juin', team: ['MB', 'LP', 'SD'] },
  { title: 'Payboard – Teaser Launch', sub: 'Teaser / Digital', pct: 90, status: 'Terminé', chip: 'ink', date: '05 juin', team: ['NM', 'KA', 'MB'] },
];

function Thumb({ seed }) {
  return (
    <span style={{
      width: 46, height: 46, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
      background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 5px, var(--paper-100) 5px 10px)',
      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg3)',
    }}>{seed}</span>
  );
}

function ProgressBar({ pct, dark }) {
  return (
    <div style={{ width: 130, height: 7, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: dark ? 'var(--ink-950)' : 'var(--orange-500)' }}></div>
    </div>
  );
}

function ProjectRow({ p, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <Thumb seed="img" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>{p.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ProgressBar pct={p.pct} dark={p.status === 'Terminé'} />
        <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 38 }}>{p.pct}%</span>
      </div>
      <Chip variant={p.chip} style={{ fontSize: 12, padding: '5px 12px' }}>{p.status}</Chip>
      <div style={{ display: 'flex' }}>
        {p.team.map((t, i) => <Avatar key={t} initials={t} size={28} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} style={{ marginLeft: i ? -8 : 0 }} />)}
      </div>
      <span style={{ fontSize: 13, color: 'var(--fg3)', width: 52, textAlign: 'right' }}>{p.date}</span>
    </div>
  );
}

function RecentProjectsCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Projets récents</span>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Voir tout</button>
      </div>
      {RECENT_PROJECTS.map((p, i) => <ProjectRow key={p.title} p={p} last={i === RECENT_PROJECTS.length - 1} />)}
    </Card>
  );
}

Object.assign(window, { ProjectProgressCard, RecentProjectsCard });
