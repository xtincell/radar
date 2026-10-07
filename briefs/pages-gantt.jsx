// Dashboard R26 × Radar — Planning (Gantt) : charge & collisions par responsable

// Tension colours (from the repo's gantt.html legend)
const TENS = {
  fair: { col: '#1F8A5B', label: 'Confort' },
  tight: { col: '#C99A5B', label: 'Serré' },
  unfair: { col: '#B4472E', label: 'Délai trop court' },
  none: { col: 'var(--border-strong)', label: 'Sans deadline' },
};

const DAYPX = 9;      // px per day
const LANE_H = 26;    // px per stacked lane
const WIN_BEFORE = 14, WIN_AFTER = 84; // window: today-14 → today+84

function typeLeadDays(type) {
  // rough "standard duration" per type (calendar days) to estimate a start
  const map = { 'Campagne 360°': 21, 'Campagne Digitale': 16, Branding: 24, Film: 18, 'Teaser / Digital': 10, Social: 6, 'Print / PLV': 10, Print: 8, Packaging: 20, Digital: 12, Édition: 30, 'Social / Print': 8, 'Social / Film': 12 };
  return map[type] || 12;
}

function GanttPage() {
  const [client, setClient] = useState('Tous');
  const [scope, setScope] = useState('open');
  const today = RADAR_TODAY;
  const winStart = new Date(today); winStart.setDate(winStart.getDate() - WIN_BEFORE);
  const winEnd = new Date(today); winEnd.setDate(winEnd.getDate() + WIN_AFTER);
  const totalDays = Math.round((winEnd - winStart) / 864e5);
  const width = totalDays * DAYPX;
  const xOf = (d) => Math.round((d - winStart) / 864e5) * DAYPX;

  const clients = ['Tous', ...[...new Set(ALL_BRIEFS.map((b) => b.client))]];

  // build bars
  const rows = ALL_BRIEFS.filter((b) => {
    if (isFrozenP(b) || b.statutRadar === 'Archivé') return false;
    if (client !== 'Tous' && b.client !== client) return false;
    if (scope === 'open' && DONE_RADAR.has(b.statutRadar)) return false;
    return true;
  });

  const tensionOf = (b) => {
    if (DONE_RADAR.has(b.statutRadar)) return 'fair';
    if (isLateP(b)) return 'unfair';
    const lead = typeLeadDays(b.type);
    const span = Math.round((new Date(b.deadline) - new Date(b.date_recu)) / 864e5);
    if (span < lead * 0.7) return 'unfair';
    if (span < lead * 1.1) return 'tight';
    return 'fair';
  };

  const byPerson = {};
  rows.forEach((b) => {
    const end = new Date(b.deadline);
    const lead = typeLeadDays(b.type);
    let start = new Date(end); start.setDate(start.getDate() - lead);
    const recu = new Date(b.date_recu);
    if (recu < end && recu > start) start = recu;
    if (end < winStart || start > winEnd) return;
    const s = start < winStart ? winStart : start;
    const e = end > winEnd ? winEnd : end;
    const owner = (b.responsable || '— non assigné').trim();
    (byPerson[owner] = byPerson[owner] || []).push({ b, start: s, end: e, tension: tensionOf(b) });
  });

  const persons = Object.keys(byPerson).sort((a, b) => byPerson[b].length - byPerson[a].length);

  // greedy lane layout per person
  function layout(bars) {
    bars.sort((a, b) => a.start - b.start || b.end - a.end);
    const laneEnds = [];
    bars.forEach((bar) => {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) { if (laneEnds[i] <= bar.start) { bar.lane = i; laneEnds[i] = bar.end; placed = true; break; } }
      if (!placed) { bar.lane = laneEnds.length; laneEnds.push(bar.end); }
    });
    return laneEnds.length || 1;
  }

  // month ruler
  const ticks = [];
  let lastMonth = -1;
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(winStart); d.setDate(d.getDate() + i);
    if (d.getDay() === 1) ticks.push({ x: i * DAYPX, type: 'week', label: d.getDate() });
    if (d.getMonth() !== lastMonth) { lastMonth = d.getMonth(); ticks.push({ x: i * DAYPX, type: 'month', label: d.toLocaleDateString('fr-FR', { month: 'short' }) }); }
  }
  const todayX = xOf(today);

  return (
    <React.Fragment>
      <PageHead title="Planning" sub="Gantt de l'équipe — charge & collisions. Chaque barre = un projet ouvert, de son début estimé à sa deadline." />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--fg2)' }}>
          <span style={{ fontWeight: 700 }}>Tension :</span>
          {Object.values(TENS).map((t) => (
            <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 13, height: 13, borderRadius: 4, background: t.col }}></span>{t.label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {['Tous', 'open'].includes(scope) && null}
          <select value={client} onChange={(e) => setClient(e.target.value)} style={selStyle}>
            {clients.map((c) => <option key={c} value={c}>{c === 'Tous' ? 'Tous les clients' : c}</option>)}
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value)} style={selStyle}>
            <option value="open">Projets ouverts</option>
            <option value="all">Tout (avec livrés)</option>
          </select>
        </div>
      </div>

      <Card pad={0} style={{ overflow: 'auto' }}>
        <div style={{ minWidth: width + 190, position: 'relative' }}>
          {/* header ruler */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface, #fff)', zIndex: 2 }}>
            <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Responsable</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{persons.length} pers. · {rows.length} projets</div>
            </div>
            <div style={{ position: 'relative', width, height: 40 }}>
              {ticks.map((t, i) => t.type === 'month'
                ? <span key={i} style={{ position: 'absolute', top: 5, left: t.x + 3, fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--fg2)', textTransform: 'uppercase' }}>{t.label}</span>
                : <React.Fragment key={i}><span style={{ position: 'absolute', top: 0, bottom: 0, left: t.x, width: 1, background: 'var(--border)' }}></span><span style={{ position: 'absolute', top: 22, left: t.x, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg4, #a89c8b)' }}>{t.label}</span></React.Fragment>)}
              <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, width: 2, background: 'var(--orange-500)', zIndex: 3 }}></span>
              <span style={{ position: 'absolute', top: 3, left: todayX + 4, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--orange-600)', whiteSpace: 'nowrap' }}>auj.</span>
            </div>
          </div>
          {/* rows */}
          {persons.map((p) => {
            const bars = byPerson[p];
            const lanes = layout(bars);
            const h = lanes * LANE_H + 8;
            // weekly overload veil
            const veils = [];
            for (let w = 0; w * 7 < totalDays; w++) {
              const ws = new Date(winStart); ws.setDate(ws.getDate() + w * 7);
              const we = new Date(ws); we.setDate(we.getDate() + 7);
              const n = bars.filter((b) => b.start < we && b.end > ws).length;
              if (n >= 3) veils.push({ x: w * 7 * DAYPX, w: 7 * DAYPX });
            }
            const peak = Math.max(0, ...(() => { const arr = []; for (let w = 0; w * 7 < totalDays; w++) { const ws = new Date(winStart); ws.setDate(ws.getDate() + w * 7); const we = new Date(ws); we.setDate(we.getDate() + 7); arr.push(bars.filter((b) => b.start < we && b.end > ws).length); } return arr; })());
            return (
              <div key={p} style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar initials={initialsFromName(p)} size={24} tint="var(--orange-200)" />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstNameOf(p)}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: peak >= 3 ? '#B4472E' : 'var(--fg3)' }}>{bars.length} projet{bars.length > 1 ? 's' : ''}{peak >= 3 ? ' · ⚠ surcharge' : ''}</span>
                </div>
                <div style={{ position: 'relative', width, height: h }}>
                  {veils.map((v, i) => <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: v.x, width: v.w, background: '#B4472E', opacity: 0.07 }}></span>)}
                  <span style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, width: 2, background: 'var(--orange-500)', opacity: 0.4 }}></span>
                  {bars.map((bar) => (
                    <div key={bar.b.ndeg} title={`${bar.b.ndeg} — ${bar.b.title}`} style={{
                      position: 'absolute', left: xOf(bar.start), top: 4 + bar.lane * LANE_H,
                      width: Math.max(16, xOf(bar.end) - xOf(bar.start)), height: 20, borderRadius: 6,
                      background: TENS[bar.tension].col, color: '#fff', fontSize: 10.5, fontWeight: 700,
                      display: 'flex', alignItems: 'center', padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      boxShadow: '0 1px 3px rgba(0,0,0,.12)', cursor: 'pointer',
                    }}>{bar.b.ndeg} · {bar.b.title}</div>
                  ))}
                </div>
              </div>
            );
          })}
          {!persons.length && <div style={{ padding: 50, textAlign: 'center', color: 'var(--fg3)' }}>Aucun projet daté à planifier pour ce filtre.</div>}
        </div>
      </Card>
    </React.Fragment>
  );
}

const selStyle = {
  appearance: 'none', border: '1px solid var(--border)', background: 'var(--surface, #fff)', color: 'var(--fg1)',
  font: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 30px 9px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
};

Object.assign(window, { GanttPage });
