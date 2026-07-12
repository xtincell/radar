// Dashboard R26 × Radar — modale « brief léger » : d'un coup d'œil sur une tâche,
// consulter le brief créatif associé (défaut) et au besoin le brief client initial.
// Porté de ui.js/openBriefModal : 4 onglets avec scores, dossier hérité du projet maître.

const BRIEF_TABS = [
  { key: 'crea', label: 'DA / Créa' },
  { key: 'client', label: 'Brief client' },
  { key: 'prod', label: 'Production' },
  { key: 'cs', label: 'Case study' },
];

function bmFilled(v) { return v != null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ''); }

function bmScore(voletKey, data) {
  const sections = (window.GABARIT_SCHEMA || {})[voletKey] || [];
  let total = 0, filled = 0;
  sections.forEach((s) => s.fields.forEach(([k]) => { total++; if (bmFilled((data || {})[k])) filled++; }));
  return total ? Math.round((filled / total) * 100) : 0;
}

// La tâche pointe vers le projet maître qui porte le brief (héritage parent, cf. repo).
const TASK_PROJECT_MAP = {
  'Campagne La Pasta': 'PAN-014',
  'Bonnet Rouge – Ramadan': 'BNR-021',
  'AGL – Brand Refresh': 'AGL-007',
  'Payboard – Teaser': 'PBD-003',
};
function findProjectForTask(sub) {
  const nd = TASK_PROJECT_MAP[sub];
  return nd ? (window.PROJECTS || []).find((p) => p.ndeg === nd) : null;
}

function BriefModal({ p, onClose }) {
  const [tab, setTab] = useState('crea');
  const dossier = (window.GABARIT_DATA || {})[p.ndeg] || null;
  const data = dossier ? dossier[tab] : null;
  const sections = ((window.GABARIT_SCHEMA || {})[tab] || [])
    .map((s) => ({ ...s, fields: s.fields.filter(([k]) => bmFilled((data || {})[k])) }))
    .filter((s) => s.fields.length);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20,14,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', maxWidth: 640, width: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', background: 'var(--paper-100)', padding: '3px 8px', borderRadius: 6 }}>{p.ndeg}</span>
            {p.deadlineHard && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-700)' }}>⚑ échéance exigée client</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, margin: '6px 0 3px' }}>{p.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client), flexShrink: 0 }}></span>
            {p.client} · {p.marque} · {p.statutRadar} · échéance {fmtDateP(p.deadline)}
          </div>
        </div>
        {/* tabs (scores calculés sur le dossier réel) */}
        <div style={{ display: 'flex', gap: 5, padding: '11px 22px 0', flexWrap: 'wrap' }}>
          {BRIEF_TABS.map((t) => {
            const pct = dossier ? bmScore(t.key, dossier[t.key]) : 0;
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill)', padding: '7px 13px', background: on ? 'var(--ink-950)' : 'var(--paper-100)', color: on ? '#F7F2EA' : 'var(--fg2)' }}>
                {t.label} <span style={{ opacity: 0.65, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </button>
            );
          })}
        </div>
        {/* body — seuls les champs remplis, comme le mode live du repo */}
        <div style={{ padding: '14px 22px 10px', overflowY: 'auto', flex: 1, minHeight: 120 }}>
          {window.StakeStrip && <div style={{ marginBottom: 14 }}><StakeStrip client={p.client} compact /></div>}
          {sections.length ? sections.map((s, si) => (
            <div key={s.title}>
              <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', margin: si ? '16px 0 9px' : '2px 0 9px', paddingTop: si ? 12 : 0, borderTop: si ? '1px solid var(--border)' : 'none' }}>{s.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '125px 1fr', gap: '8px 14px', alignItems: 'baseline' }}>
                {s.fields.map(([k, label]) => {
                  const v = data[k];
                  return (
                    <React.Fragment key={k}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg3)', lineHeight: 1.5 }}>{label}</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{Array.isArray(v) ? v.join(' · ') : v}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )) : (
            <div style={{ color: 'var(--fg3)', fontStyle: 'italic', fontSize: 13.5, padding: '24px 2px', textAlign: 'center' }}>
              {dossier ? "Ce volet n'est pas encore rempli — à documenter dans Gabarits." : 'Pas de dossier structuré pour ce projet — à créer dans Gabarits.'}
            </div>
          )}
        </div>
        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--fg3)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Fermer</button>
          <Button variant="primary" icon="maximize-2" onClick={() => { window.__gabaritOpen = p.ndeg; if (window.appNavigate) window.appNavigate('Gabarits'); onClose && onClose(); }} style={{ flexDirection: 'row-reverse', padding: '9px 16px', fontSize: 13 }}>Dossier complet</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BriefModal, findProjectForTask });
