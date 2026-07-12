// Dashboard R26 — main layout, row 2: priority tasks + creative calendar + creative requests

// ---- Priority tasks ----

const TASKS = [
  { title: 'Finaliser KV – La Pasta (Visuel 2)', sub: 'Campagne La Pasta', prio: 'Haute', chip: 'solid', due: "Aujourd'hui" },
  { title: 'Storyboard – Film Bonnet Rouge', sub: 'Bonnet Rouge – Ramadan', prio: 'Haute', chip: 'solid', due: 'Demain' },
  { title: 'Déclinaisons OOH – AGL', sub: 'AGL – Brand Refresh', prio: 'Moyenne', chip: 'soft', due: '18 juin' },
  { title: 'Adaptation formats – Payboard', sub: 'Payboard – Teaser', prio: 'Moyenne', chip: 'soft', due: '20 juin' },
  { title: 'Moodboard – Nouvelle campagne', sub: 'Projet interne', prio: 'Basse', chip: 'outline', due: '22 juin' },
];

function TaskRow({ t, last }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <button
        onClick={() => setDone(!done)}
        style={{
          width: 21, height: 21, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          border: done ? 'none' : '1.5px solid var(--border-strong)',
          background: done ? 'var(--orange-500)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--dur-fast) var(--ease-out)',
        }}
      >
        {done && <Icon name="check" size={12} color="var(--fg-on-orange)" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.45 : 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>{t.sub}</div>
      </div>
      <Chip variant={t.chip} style={{ fontSize: 11.5, padding: '4px 11px' }}>{t.prio}</Chip>
      <span style={{ fontSize: 12.5, color: 'var(--fg3)', width: 72, textAlign: 'right', flexShrink: 0 }}>{t.due}</span>
    </div>
  );
}

function PriorityTasksCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Tâches prioritaires</span>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Voir tout</button>
      </div>
      {TASKS.map((t, i) => <TaskRow key={t.title} t={t} last={i === TASKS.length - 1} />)}
    </Card>
  );
}

// ---- Creative calendar (May 2025) ----

const CAL_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
// May 2025 starts Thursday; grid begins Mon 28 Apr.
const CAL_CELLS = (() => {
  const cells = [];
  for (let d = 28; d <= 30; d++) cells.push({ n: d, muted: true });
  for (let d = 1; d <= 31; d++) cells.push({ n: d, muted: false, sel: d === 15, dot: d === 27 || d === 28 });
  cells.push({ n: 1, muted: true });
  return cells;
})();

function CalendarCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Calendrier créatif</span>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Voir tout</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <IconBtn name="chevron-left" variant="cream" size={30} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>Mai 2025</span>
        <IconBtn name="chevron-right" variant="cream" size={30} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {CAL_DAYS.map((d) => (
          <span key={d} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg3)', padding: '6px 0' }}>{d}</span>
        ))}
        {CAL_CELLS.map((c, i) => (
          <span key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34 }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontVariantNumeric: 'tabular-nums',
              fontWeight: c.sel ? 700 : 500,
              color: c.sel ? 'var(--fg-on-orange)' : c.muted ? 'var(--fg4, var(--fg3))' : 'var(--fg1)',
              opacity: c.muted ? 0.45 : 1,
              background: c.sel ? 'var(--orange-500)' : 'transparent',
              boxShadow: c.sel ? 'var(--shadow-orange)' : 'none',
            }}>{c.n}</span>
            {c.dot && <span style={{ position: 'absolute', bottom: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--orange-500)' }}></span>}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ---- Creative requests ----

const REQUESTS = [
  { title: 'Post Instagram – Produit', by: 'Equipe Marketing', tag: 'Nouveau', chip: 'solid' },
  { title: 'Visuel événement – Conférence', by: 'Communication', tag: 'Nouveau', chip: 'solid' },
  { title: 'Cover LinkedIn – Recrutement', by: 'RH', tag: 'En cours', chip: 'outline' },
  { title: 'Infographie – Étude interne', by: 'Strategy', tag: 'En cours', chip: 'outline' },
];

function RequestsCard() {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Demandes créatives</span>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--fg3)' }}>Voir tout</button>
      </div>
      {REQUESTS.map((r, i) => (
        <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i === REQUESTS.length - 1 ? 'none' : '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 3 }}>Demandé par : {r.by}</div>
          </div>
          <Chip variant={r.chip} style={{ fontSize: 11.5, padding: '4px 11px' }}>{r.tag}</Chip>
        </div>
      ))}
    </Card>
  );
}

Object.assign(window, { PriorityTasksCard, CalendarCard, RequestsCard });
