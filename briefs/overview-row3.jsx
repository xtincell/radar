// Dashboard R26 — main layout, row 3: recent works gallery (image placeholders)

const WORKS = [
  'kv campagne la pasta',
  'visuel ramadan bonnet rouge',
  'film agl — still',
  'teaser payboard — still',
  'social bonnet rouge',
];

function WorkTile({ label }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 8px, var(--paper-100) 8px 16px)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 12,
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--dur-med) var(--ease-out), box-shadow var(--dur-med) var(--ease-out)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{label}</span>
    </div>
  );
}

function RecentWorksCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Travaux récents</span>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Voir la bibliothèque</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {WORKS.map((w) => <WorkTile key={w} label={w} />)}
      </div>
    </Card>
  );
}

Object.assign(window, { RecentWorksCard });
