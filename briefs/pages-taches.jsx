// Dashboard R26 — Tâches + Calendrier pages

const TASK_GROUPS = [
  { label: "Aujourd'hui", items: [
    { title: 'Finaliser KV – La Pasta (Visuel 2)', sub: 'Campagne La Pasta', prio: 'Haute', chip: 'solid', who: 'LP', p: 'P0', statut: 'En cours', dl: 0 },
    { title: 'Relecture storyboard – Bonnet Rouge', sub: 'Bonnet Rouge – Ramadan', prio: 'Haute', chip: 'solid', who: 'NM', p: 'P0', statut: 'En attente client', dl: -1 },
  ]},
  { label: 'Cette semaine', items: [
    { title: 'Storyboard – Film Bonnet Rouge', sub: 'Bonnet Rouge – Ramadan', prio: 'Haute', chip: 'solid', who: 'SD', p: 'P1', statut: 'En cours', dl: 2 },
    { title: 'Déclinaisons OOH – AGL', sub: 'AGL – Brand Refresh', prio: 'Moyenne', chip: 'soft', who: 'MB', p: 'P1', statut: 'Bloqué', dl: 3 },
    { title: 'Adaptation formats – Payboard', sub: 'Payboard – Teaser', prio: 'Moyenne', chip: 'soft', who: 'KA', p: 'P1', statut: 'En cours', dl: 4 },
  ]},
  { label: 'Plus tard', items: [
    { title: 'Moodboard – Nouvelle campagne', sub: 'Projet interne', prio: 'Basse', chip: 'outline', who: 'LP', p: 'P2', statut: 'Reçu', dl: 8 },
    { title: 'Veille créative – Q3', sub: 'Projet interne', prio: 'Basse', chip: 'outline', who: 'NM', p: 'P2', statut: 'Reçu', dl: 12 },
  ]},
];

const WHO_NAME = { LP: 'Laure', NM: 'Nelson', KA: 'Karim', SD: 'Sarah', MB: 'Marc' };
const TK_TODAY = new Date(new Date().toDateString());
function tkDeadline(dl) { const d = new Date(TK_TODAY); d.setDate(d.getDate() + dl); return d; }
function tkLate(t) { return t.statut !== 'Livré' && tkDeadline(t.dl) < TK_TODAY; }
function tkDaysLate(t) { return Math.round((TK_TODAY - tkDeadline(t.dl)) / 864e5); }
function tkFmt(dl) { return dl === 0 ? "aujourd'hui" : tkDeadline(dl).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

function BigTaskRow({ t, last, onOpen, onBrief }) {
  const [done, setDone] = useState(false);
  return (
    <div onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', cursor: 'pointer', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <button onClick={(e) => { e.stopPropagation(); setDone(!done); }} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: done ? 'none' : '1.5px solid var(--border-strong)',
        background: done ? 'var(--orange-500)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}>
        {done && <Icon name="check" size={13} color="var(--fg-on-orange)" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.45 : 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{t.sub}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUT_COL[t.statut] }}></span>{t.statut}</span>
          <span style={{ color: tkLate(t) ? '#B4472E' : 'var(--fg3)', fontWeight: tkLate(t) ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="calendar" size={12} /> {tkLate(t) ? `+${tkDaysLate(t)}j` : tkFmt(t.dl)}
          </span>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: t.p === 'P0' ? 'var(--orange-600)' : 'var(--fg3)' }}>{t.p}</span>
      <Chip variant={t.chip} style={{ fontSize: 11.5, padding: '4px 11px' }}>{t.prio}</Chip>
      {onBrief && (
        <span onClick={(e) => { e.stopPropagation(); onBrief(); }} title="Consulter le brief (créatif / client)">
          <IconBtn name="book-open" variant="cream" size={30} />
        </span>
      )}
      <Avatar initials={t.who} size={28} tint="var(--orange-200)" />
    </div>
  );
}

function TachesPage() {
  const [selected, setSelected] = useState(null);
  const [who, setWho] = useState('Tous');
  const [briefP, setBriefP] = useState(null);
  if (selected) return <TacheDetail t={selected.t} group={selected.group} onBack={() => setSelected(null)} />;
  const PEOPLE = ['Tous', 'LP', 'NM', 'KA', 'SD', 'MB'];
  const total = TASK_GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <React.Fragment>
      <PageHead title="Tâches" sub={`${total} tâches ouvertes sur 4 projets`} action="Nouvelle tâche" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {PEOPLE.map((w) => (
          <button key={w} onClick={() => setWho(w)} style={{
            border: who === w ? 'none' : '1.5px solid var(--border-strong)',
            background: who === w ? 'var(--ink-950)' : 'transparent', color: who === w ? '#fff' : 'var(--fg2)',
            padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
          }}>{w === 'Tous' ? 'Toute l’équipe' : WHO_NAME[w]}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
        {TASK_GROUPS.map((g) => {
          const items = who === 'Tous' ? g.items : g.items.filter((t) => t.who === who);
          if (!items.length) return null;
          return (
            <Card key={g.label}>
              <div className="r26-label" style={{ color: 'var(--fg3)', marginBottom: 4 }}>{g.label}</div>
              {items.map((t, i) => {
                const proj = findProjectForTask(t.sub);
                return <BigTaskRow key={t.title} t={t} last={i === items.length - 1} onOpen={() => setSelected({ t, group: g.label })} onBrief={proj ? () => setBriefP(proj) : null} />;
              })}
            </Card>
          );
        })}
      </div>
      {briefP && <BriefModal p={briefP} onClose={() => setBriefP(null)} />}
    </React.Fragment>
  );
}

// ---- Calendrier (full month) ----

const CAL_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function EventDetailPanel({ ev, onClose }) {
  const kinds = { solid: 'En retard', ink: 'Deadline ferme ⚑', soft: 'Échéance', outline: 'Bouclé' };
  const chips = { solid: 'solid', ink: 'ink', soft: 'soft', outline: 'outline' };
  const b = ev.b || {};
  return (
    <Card style={{ alignSelf: 'start', position: 'sticky', top: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>{ev.label}</div>
          <div style={{ fontSize: 13, color: 'var(--fg3)', marginTop: 3 }}>Échéance {b.deadline ? fmtDateP(b.deadline) : ev.day}{b.deadlineHard ? ' · exigée par le client ⚑' : ''}</div>
        </div>
        <IconBtn name="x" variant="cream" size={32} onClick={onClose} />
      </div>
      <Chip variant={chips[ev.tone]} style={{ fontSize: 11.5, padding: '4px 11px' }}>{kinds[ev.tone]}</Chip>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--fg2)' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: clientColOf(b.client), flexShrink: 0 }}></span>
          {b.client}{b.marque && b.marque !== b.client ? ` · ${b.marque}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--fg2)' }}>
          <Icon name="hash" size={15} color="var(--fg3)" /> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.ndeg}</span> · {b.type || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--fg2)' }}>
          <Icon name="user" size={15} color="var(--fg3)" />
          {b.responsable ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar initials={initialsFromName(b.responsable)} size={26} tint="var(--orange-200)" /> {b.responsable}
            </span>
          ) : 'Non assigné'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--fg2)' }}>
          <Icon name="activity" size={15} color="var(--fg3)" /> Statut : {b.statutRadar || b.statut || '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Button variant="dark" icon="folder-open" onClick={() => { if (window.appNavigate) { window.__gabaritOpen = b.ndeg; window.appNavigate('Gabarits'); } }} style={{ flexDirection: 'row-reverse', padding: '9px 16px', fontSize: 13.5 }}>Dossier</Button>
        <Button variant="ghost" icon="pencil" style={{ flexDirection: 'row-reverse', padding: '9px 16px', fontSize: 13.5 }}>Modifier</Button>
      </div>
    </Card>
  );
}

function CalendrierPage() {
  const calToday = new Date(new Date().toDateString());
  const [ym, setYm] = useState({ y: calToday.getFullYear(), m: calToday.getMonth() });
  const [selEv, setSelEv] = useState(null);
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  // échéances réelles du portefeuille pour le mois affiché
  const evByDay = {};
  (window.ALL_BRIEFS || []).forEach((b) => {
    if (!b.deadline || !/^\d{4}/.test(b.deadline)) return;
    const d = new Date(b.deadline + 'T00:00:00');
    if (d.getFullYear() !== ym.y || d.getMonth() !== ym.m) return;
    const done = (typeof DONE_RADAR !== 'undefined' && DONE_RADAR.has(b.statutRadar)) || b.closedAt;
    const tone = done ? 'outline' : isLateP(b) ? 'solid' : b.deadlineHard ? 'ink' : 'soft';
    (evByDay[d.getDate()] = evByDay[d.getDate()] || []).push({ label: b.title, tone, b });
  });
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const prevDim = new Date(ym.y, ym.m, 0).getDate();
  const cells = [];
  for (let i = lead; i > 0; i--) cells.push({ n: prevDim - i + 1, muted: true });
  for (let d = 1; d <= dim; d++) cells.push({ n: d, muted: false, today: ym.y === calToday.getFullYear() && ym.m === calToday.getMonth() && d === calToday.getDate(), events: evByDay[d] || [] });
  const calTail = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= calTail; d++) cells.push({ n: d, muted: true });
  const eventTones = {
    solid: { background: 'var(--orange-500)', color: 'var(--fg-on-orange)' },
    ink: { background: 'var(--ink-950)', color: '#fff' },
    soft: { background: 'var(--orange-50)', color: 'var(--orange-700)' },
    outline: { background: 'var(--paper-100)', color: 'var(--fg2)', border: '1px solid var(--border)' },
  };
  return (
    <React.Fragment>
      <PageHead title="Calendrier" sub="Échéances réelles du portefeuille — retard en plein, deadline ferme ⚑ en encre, bouclé en contour" action="Nouvel événement" />
      <div style={{ display: 'grid', gridTemplateColumns: selEv ? '8.5fr 3.5fr' : '1fr', gap: 20, alignItems: 'start' }}>
      <Card pad={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <IconBtn name="chevron-left" variant="cream" size={34} onClick={() => { setSelEv(null); setYm(ym.m === 0 ? { y: ym.y - 1, m: 11 } : { y: ym.y, m: ym.m - 1 }); }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{CAL_MOIS[ym.m]} {ym.y}</span>
          <IconBtn name="chevron-right" variant="cream" size={34} onClick={() => { setSelEv(null); setYm(ym.m === 11 ? { y: ym.y + 1, m: 0 } : { y: ym.y, m: ym.m + 1 }); }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((d) => (
            <span key={d} style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg3)', padding: '4px 8px' }}>{d}</span>
          ))}
          {cells.map((c, i) => (
            <div key={i} style={{
              minHeight: 92, borderRadius: 12, padding: 8,
              background: c.muted ? 'transparent' : 'var(--paper-100)',
              border: c.today ? '1.5px solid var(--orange-500)' : '1px solid var(--border)',
              opacity: c.muted ? 0.45 : 1,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{
                fontSize: 12.5, fontWeight: c.today ? 700 : 500, fontVariantNumeric: 'tabular-nums',
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: c.today ? 'var(--orange-500)' : 'transparent',
                color: c.today ? 'var(--fg-on-orange)' : 'var(--fg2)',
              }}>{c.n}</span>
              {(c.events || []).map((e) => (
                <span key={e.label} onClick={() => setSelEv({ ...e, day: c.n })} style={{
                  fontSize: 10.5, fontWeight: 600, padding: '3px 7px', borderRadius: 6, cursor: 'pointer',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  outline: selEv && selEv.label === e.label ? '2px solid var(--orange-500)' : 'none', outlineOffset: 1,
                  ...eventTones[e.tone],
                }}>{e.label}</span>
              ))}
            </div>
          ))}
        </div>
      </Card>
      {selEv && <EventDetailPanel ev={selEv} onClose={() => setSelEv(null)} />}
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { TachesPage, CalendrierPage });
