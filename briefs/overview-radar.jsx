// Dashboard R26 — Radar cards for « Vue d'ensemble » (computed from PROJECTS).
// Additive: these sit alongside the existing overview cards.

function AtraiterCard() {
  const [seg, setSeg] = useState('all');
  const active = PROJECTS.filter(isActiveP);
  const counts = {
    all: active.length,
    late: active.filter(isLateP).length,
    p0: active.filter((p) => p.prio === 'P0').length,
    wait: active.filter((p) => p.statutRadar === 'En attente client').length,
  };
  let list = active.slice();
  if (seg === 'late') list = list.filter(isLateP);
  else if (seg === 'p0') list = list.filter((p) => p.prio === 'P0');
  else if (seg === 'wait') list = list.filter((p) => p.statutRadar === 'En attente client');
  list.sort((a, b) => urgencyP(a).rank - urgencyP(b).rank);
  const SEGS = [['all', 'Tout'], ['late', 'Retard'], ['p0', 'P0'], ['wait', 'Attente']];
  const urgCols = { late: '#B4472E', block: '#B4472E', p0: 'var(--orange-500)', wait: '#C99A5B', p1: 'var(--border-strong)' };
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>À traiter</span>
        <span style={{ fontSize: 12, color: 'var(--fg3)' }}>trié par urgence</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {SEGS.map(([k, l]) => (
          <button key={k} onClick={() => setSeg(k)} style={{
            border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            background: seg === k ? 'var(--ink-950)' : 'var(--paper-100)',
            color: seg === k ? '#fff' : 'var(--fg2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{l}<span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{counts[k]}</span></button>
        ))}
      </div>
      <div>
        {list.length ? list.map((p) => {
          const u = urgencyP(p);
          return (
            <div key={p.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client), flexShrink: 0 }}></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.marque}{isLateP(p) && <span style={{ color: '#B4472E' }}> · en retard de {daysLateP(p)}j</span>} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{p.ndeg}</span>
                </div>
              </div>
              {u.tag !== 'normal' && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-pill)', color: '#fff', background: urgCols[u.tag], flexShrink: 0, whiteSpace: 'nowrap' }}>{u.label}</span>}
            </div>
          );
        }) : <div style={{ fontSize: 13.5, color: 'var(--fg3)', padding: '18px 0', textAlign: 'center' }}>Rien dans cette file. ✓</div>}
      </div>
    </Card>
  );
}

function OverviewPipelineCard() {
  const order = ['En cours', 'En attente client', 'Reçu', 'Bloqué', 'Livré', 'Bouclé'];
  const counts = {};
  PROJECTS.forEach((p) => { let s = p.statutRadar; if (s === 'Validé') s = 'Livré'; if (s === 'Archivé' || isFrozenP(p)) return; counts[s] = (counts[s] || 0) + 1; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const shown = order.filter((s) => counts[s]);
  return (
    <Card>
      <CardHead title="Pipeline" />
      <div style={{ display: 'flex', gap: 3, height: 15, marginBottom: 16 }}>
        {shown.map((s) => <span key={s} title={s} style={{ width: `${(counts[s] / total) * 100}%`, background: STATUT_COL[s], borderRadius: 4 }}></span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {shown.map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUT_COL[s], flexShrink: 0 }}></span>
            <span style={{ flex: 1, color: 'var(--fg2)' }}>{s}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{counts[s]}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OverviewChargeClientCard() {
  const map = {};
  PROJECTS.filter(isActiveP).forEach((p) => { (map[p.client] = map[p.client] || []).push(p); });
  const rows = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  const max = rows.length ? rows[0][1].length : 1;
  return (
    <Card>
      <CardHead title="Charge par client" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(([c, arr]) => {
          const lateN = arr.filter(isLateP).length;
          return (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 110, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: clientColOf(c), flexShrink: 0 }}></span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
              </span>
              <span style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--paper-200)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${(arr.length / max) * 100}%`, height: '100%', borderRadius: 5, background: 'var(--orange-500)' }}></span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'flex', gap: 6, alignItems: 'center' }}>
                {arr.length}{lateN ? <span style={{ color: '#B4472E', fontSize: 11 }}>{lateN} ⏱</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

Object.assign(window, { AtraiterCard, OverviewPipelineCard, OverviewChargeClientCard });
