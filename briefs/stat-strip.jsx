// Dashboard R26 — stat strip: 4 KPI cards under the header

const STATS = [
  { label: 'Projets en cours', value: 14, icon: 'folder', delta: '2 depuis la semaine dernière', dir: 'up' },
  { label: 'Tâches en cours', value: 38, icon: 'clipboard-list', delta: '5 depuis la semaine dernière', dir: 'up' },
  { label: 'Demandes créatives', value: 7, icon: 'sparkles', delta: '1 depuis la semaine dernière', dir: 'down' },
  { label: 'Projets terminés', value: 23, icon: 'check-circle-2', delta: '8 ce mois-ci', dir: 'up' },
];

function StatCard({ label, value, icon, delta, dir }) {
  return (
    <Card pad={22} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={21} color="var(--orange-600)" />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg2)' }}>{label}</div>
        <div className="r26-stat" style={{ fontSize: 34, lineHeight: 1.15, marginTop: 2 }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: 'var(--fg3)' }}>
          <Icon name={dir === 'up' ? 'arrow-up-right' : 'arrow-down-right'} size={13} color={dir === 'up' ? 'var(--orange-600)' : 'var(--fg3)'} />
          <span>{delta}</span>
        </div>
      </div>
    </Card>
  );
}

function StatStrip() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
      {STATS.map((s) => <StatCard key={s.label} {...s} />)}
    </div>
  );
}

Object.assign(window, { StatStrip });
