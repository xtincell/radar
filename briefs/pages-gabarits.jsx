// Dashboard R26 × Radar — Gabarits : rendu du brief structuré (schéma + données réelles)

function gabaritFilled(v) {
  return v != null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');
}

// completion % of a volet = filled fields / total schema fields
function voletScore(voletKey, data) {
  const sections = GABARIT_SCHEMA[voletKey] || [];
  let total = 0, filled = 0;
  sections.forEach((s) => s.fields.forEach(([k]) => { total++; if (gabaritFilled((data || {})[k])) filled++; }));
  return total ? Math.round((filled / total) * 100) : 0;
}

function gScoreCol(p) {
  if (p >= 100) return { c: '#1F8A5B', b: 'var(--orange-50)' };
  if (p >= 50) return { c: 'var(--orange-700)', b: 'var(--orange-50)' };
  if (p > 0) return { c: '#C99A5B', b: 'var(--paper-200)' };
  return { c: 'var(--fg3)', b: 'var(--paper-200)' };
}

function GabaritField({ label, value, kind }) {
  const filled = gabaritFilled(value);
  const full = kind === 'long' || kind === 'list';
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', gap: 5, padding: '13px 15px', borderRadius: 12, background: filled ? 'var(--surface, #fff)' : 'var(--paper-50)', border: '1px solid var(--border)' }}>
      <span className="r26-label" style={{ color: filled ? 'var(--orange-600)' : 'var(--fg4, #a89c8b)', fontSize: 10 }}>{label}</span>
      {!filled ? <span style={{ fontSize: 14, color: 'var(--fg4, #a89c8b)' }}>—</span>
        : kind === 'list' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 2 }}>
            {value.map((v) => <Chip key={v} variant="outline" style={{ fontSize: 12, padding: '4px 11px' }}>{v}</Chip>)}
          </div>
        ) : <span style={{ fontSize: kind === 'long' ? 14.5 : 14, lineHeight: 1.55, color: 'var(--fg1)', fontWeight: kind === 'long' ? 400 : 600 }}>{value}</span>}
    </div>
  );
}

function GabaritSection({ section, data }) {
  const anyFilled = section.fields.some(([k]) => gabaritFilled((data || {})[k]));
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: anyFilled ? 'var(--fg1)' : 'var(--fg3)' }}>{section.title}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }}></span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{section.fields.filter(([k]) => gabaritFilled((data || {})[k])).length}/{section.fields.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {section.fields.map(([k, label, kind]) => <GabaritField key={k} label={label} value={(data || {})[k]} kind={kind} />)}
      </div>
    </div>
  );
}

function GabaritsPage() {
  const withBrief = ALL_BRIEFS.filter((b) => GABARIT_DATA[b.ndeg]);
  const [sel, setSel] = useState(() => {
    const g = window.__gabaritOpen; window.__gabaritOpen = null;
    return (g && GABARIT_DATA[g]) ? g : (withBrief[0] ? withBrief[0].ndeg : null);
  });
  const [volet, setVolet] = useState('suivi');
  const brief = GABARIT_DATA[sel] || {};
  const proj = ALL_BRIEFS.find((b) => b.ndeg === sel) || {};
  const sections = GABARIT_SCHEMA[volet] || [];
  const voletData = brief[volet] || {};
  const globalScore = Math.round(VOLETS.reduce((s, v) => s + voletScore(v.key, brief[v.key]), 0) / VOLETS.length);

  return (
    <React.Fragment>
      <PageHead title="Gabarits" sub="Brief structuré — du contexte client au case study, piloté par les données du projet" action="Imprimer / PDF" actionIcon="printer" />

      {/* project picker */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {withBrief.map((b) => (
          <button key={b.ndeg} onClick={() => setSel(b.ndeg)} style={{
            border: sel === b.ndeg ? 'none' : '1.5px solid var(--border-strong)',
            background: sel === b.ndeg ? 'var(--ink-950)' : 'transparent', color: sel === b.ndeg ? '#fff' : 'var(--fg2)',
            padding: '9px 15px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(b.client) }}></span>
            {b.title}
          </button>
        ))}
      </div>

      {/* brief header — document masthead */}
      <Card style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, borderTop: '4px solid var(--orange-500)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', background: 'var(--paper-100)', padding: '5px 11px', borderRadius: 7 }}>{proj.ndeg}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{proj.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(proj.client) }}></span>{proj.client} · {proj.marque} · {proj.type} · {proj.responsable}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: gScoreCol(globalScore).c }}>{globalScore}%</div>
          <div style={{ fontSize: 11, color: 'var(--fg3)' }}>complétude dossier</div>
        </div>
      </Card>

      {window.StakeStrip && proj.client && <div style={{ marginBottom: 18 }}><StakeStrip client={proj.client} compact /></div>}

      {/* volet tabs with completion scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 22 }}>
        {VOLETS.map((v) => {
          const pct = voletScore(v.key, brief[v.key]);
          const sc = gScoreCol(pct);
          const on = volet === v.key;
          return (
            <button key={v.key} onClick={() => setVolet(v.key)} style={{
              border: on ? '2px solid var(--orange-500)' : '1px solid var(--border)', background: on ? 'var(--surface, #fff)' : 'var(--paper-50)',
              borderRadius: 'var(--radius-md, 14px)', padding: '13px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
              display: 'flex', flexDirection: 'column', gap: 9,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon name={v.icon} size={17} color={on ? 'var(--orange-600)' : 'var(--fg3)'} />
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', color: sc.c, background: sc.b }}>{pct}%</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--fg1)' : 'var(--fg2)', lineHeight: 1.25 }}>{v.label}</span>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--paper-200)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: sc.c }}></div></div>
            </button>
          );
        })}
      </div>

      {/* sections */}
      <Card style={{ padding: 26 }}>
        <div className="r26-label" style={{ color: 'var(--orange-600)', marginBottom: 4 }}>{VOLETS.find((v) => v.key === volet).label}</div>
        <div style={{ marginTop: 16 }}>
          {sections.map((s) => <GabaritSection key={s.title} section={s} data={voletData} />)}
        </div>
      </Card>
    </React.Fragment>
  );
}

Object.assign(window, { GabaritsPage });
