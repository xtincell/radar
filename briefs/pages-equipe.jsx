// Dashboard R26 — Ressources + Bibliothèque + Équipe pages

const TEAM = [
  { name: 'Nelson Metougue', role: 'Directeur Créatif', init: 'NM', load: 85, projects: 4 },
  { name: 'Laure Pemha', role: 'Directrice Artistique', init: 'LP', load: 70, projects: 3 },
  { name: 'Karim Abanda', role: 'Designer Graphique', init: 'KA', load: 92, projects: 4 },
  { name: 'Sarah Dikongue', role: 'Motion Designer', init: 'SD', load: 55, projects: 2 },
  { name: 'Marc Biya', role: 'Copywriter', init: 'MB', load: 40, projects: 3 },
];

function LoadBar({ pct }) {
  const over = pct >= 85;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 220 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: over ? 'var(--orange-600)' : 'var(--ink-950)' }}></div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 38, color: over ? 'var(--orange-600)' : 'var(--fg1)' }}>{pct}%</span>
    </div>
  );
}

const MEMBER_ALLOC = {
  NM: [{ p: 'Campagne La Pasta', pct: 30 }, { p: 'Bonnet Rouge – Ramadan', pct: 25 }, { p: 'AGL – Brand Refresh', pct: 20 }, { p: 'Payboard – Teaser', pct: 10 }],
  LP: [{ p: 'Campagne La Pasta', pct: 35 }, { p: 'AGL – Brand Refresh', pct: 25 }, { p: 'Projet interne', pct: 10 }],
  KA: [{ p: 'Campagne La Pasta', pct: 40 }, { p: 'Payboard – Teaser', pct: 30 }, { p: 'Bonnet Rouge – Ramadan', pct: 12 }, { p: 'Demandes créatives', pct: 10 }],
  SD: [{ p: 'Bonnet Rouge – Ramadan', pct: 35 }, { p: 'Payboard – Teaser', pct: 20 }],
  MB: [{ p: 'AGL – Brand Refresh', pct: 20 }, { p: 'Campagne La Pasta', pct: 12 }, { p: 'Projet interne', pct: 8 }],
};

const SLA_TODAY = new Date(new Date().toDateString());
const daysToP = (p) => Math.round((new Date(p.deadline) - SLA_TODAY) / 864e5);

function SlaView() {
  const rows = (window.PROJECTS || []).filter((p) => !DONE_RADAR.has(p.statutRadar) || isLateP(p));
  const onTime = (window.PROJECTS || []).filter((p) => isActiveP(p) && !isLateP(p)).length;
  const activeTotal = (window.PROJECTS || []).filter(isActiveP).length || 1;
  const rate = Math.round((onTime / activeTotal) * 100);
  const slaState = (p) => {
    if (isLateP(p)) return { label: `Dépassé +${daysLateP(p)}j`, col: '#B4472E', chip: 'outline' };
    if (DONE_RADAR.has(p.statutRadar)) return { label: 'Livré dans les temps', col: '#1F8A5B', chip: 'outline' };
    const d = daysToP(p);
    if (d >= 0 && d <= 2) return { label: 'Sous tension', col: '#C99A5B', chip: 'soft' };
    return { label: 'Dans les temps', col: '#1F8A5B', chip: 'outline' };
  };
  return (
    <React.Fragment>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 20 }}>
        <Card pad={20}><div style={{ fontSize: 13, color: 'var(--fg3)' }}>Respect des échéances</div><div className="r26-stat" style={{ fontSize: 34, color: '#1F8A5B', marginTop: 2 }}>{rate}%</div></Card>
        <Card pad={20}><div style={{ fontSize: 13, color: 'var(--fg3)' }}>En dépassement</div><div className="r26-stat" style={{ fontSize: 34, color: '#B4472E', marginTop: 2 }}>{(window.PROJECTS || []).filter(isLateP).length}</div></Card>
        <Card pad={20}><div style={{ fontSize: 13, color: 'var(--fg3)' }}>Sous tension (≤ 2j)</div><div className="r26-stat" style={{ fontSize: 34, color: 'var(--orange-600)', marginTop: 2 }}>{(window.PROJECTS || []).filter((p) => isActiveP(p) && daysToP(p) >= 0 && daysToP(p) <= 2).length}</div></Card>
        <Card pad={20}><div style={{ fontSize: 13, color: 'var(--fg3)' }}>Délais injustes (demandeur)</div><div className="r26-stat" style={{ fontSize: 34, color: '#B4472E', marginTop: 2 }}>{(window.PROJECTS || []).filter((p) => isActiveP(p) && tensionP(p) === 'unfair').length}</div></Card>
      </div>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '14px 24px', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span style={{ flex: 1 }}>Projet</span>
          <span style={{ width: 110 }}>Responsable</span>
          <span style={{ width: 105, textAlign: 'right' }}>Exigé</span>
          <span style={{ width: 95, textAlign: 'right' }}>Réaliste</span>
          <span style={{ width: 120, textAlign: 'right' }}>Tension délai</span>
          <span style={{ width: 140, textAlign: 'right' }}>Respect SLA</span>
        </div>
        {rows.map((p, i) => {
          const s = slaState(p);
          const tn = tensionP(p);
          const TN = { unfair: ['Délai injuste', '#B4472E'], tight: ['Serré', '#C99A5B'], fair: ['Confortable', '#1F8A5B'], none: ['—', 'var(--fg3)'] };
          return (
            <div key={p.ndeg} style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client), flexShrink: 0 }}></span>
                <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
              </span>
              <span style={{ width: 110, fontSize: 13, color: 'var(--fg2)' }}>{p.responsable.split(' ')[0]}</span>
              <span style={{ width: 105, textAlign: 'right', fontSize: 13, color: 'var(--fg2)' }}>{fmtDateP(p.deadline)}{p.deadlineHard && <span title="échéance exigée client" style={{ color: 'var(--orange-700)', fontWeight: 700 }}> ⚑</span>}</span>
              <span style={{ width: 95, textAlign: 'right', fontSize: 13, color: 'var(--fg3)' }}>{realisticDateP(p) ? fmtDateP(realisticDateP(p)) : '—'}</span>
              <span style={{ width: 120, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: TN[tn][1] }}>{TN[tn][0]}</span>
              <span style={{ width: 140, textAlign: 'right' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: s.col }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.col }}></span>{s.label}
                </span>
                {isLateP(p) && p.attenteClient > 0 && (
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--fg3)', marginTop: 2 }}>dont {p.attenteClient}j attente client · net créa {Math.max(0, daysLateP(p) - p.attenteClient)}j</span>
                )}
              </span>
            </div>
          );
        })}
      </Card>
      <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 12, lineHeight: 1.55 }}>
        Réaliste = réception + durée étalon du type de livrable + 5 j ouvrés de marge agence · ⚑ = échéance exigée par le demandeur.
        « Délai injuste » = échéance exigée plus courte que la durée étalon → le retard est imputable à la gestion client, pas à la créa.
        Le chrono s'arrête pendant l'attente client : le retard net créa exclut ces jours (séparation retard créa / retard gestion client).
      </div>
    </React.Fragment>
  );
}

function RessourcesPage() {
  const [open, setOpen] = useState('KA');
  const [mode, setMode] = useState('charge');
  return (
    <React.Fragment>
      <PageHead title="Ressources" sub={mode === 'charge' ? "Charge de travail de l'équipe cette semaine" : 'Respect des délais par projet (SLA)'} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['charge', 'Charge équipe'], ['sla', 'SLA']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            border: mode === k ? 'none' : '1.5px solid var(--border-strong)',
            background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {mode === 'sla' ? <SlaView /> : (
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '14px 24px', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span style={{ flex: 1 }}>Membre</span>
          <span style={{ width: 220 }}>Charge</span>
          <span style={{ width: 110, textAlign: 'right' }}>Projets actifs</span>
          <span style={{ width: 40 }}></span>
        </div>
        {TEAM.map((m, i) => (
          <React.Fragment key={m.init}>
          <div
            onClick={() => setOpen(open === m.init ? null : m.init)}
            style={{ display: 'flex', alignItems: 'center', padding: '15px 24px', cursor: 'pointer', background: open === m.init ? 'var(--paper-100)' : 'transparent', borderBottom: i === TEAM.length - 1 && open !== m.init ? 'none' : '1px solid var(--border)', transition: 'background var(--dur-fast) var(--ease-out)' }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar initials={m.init} size={38} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{m.role}</div>
              </div>
            </div>
            <LoadBar pct={m.load} />
            <span style={{ width: 110, textAlign: 'right', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.projects}</span>
            <span style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>
              <Icon name={open === m.init ? 'chevron-up' : 'chevron-down'} size={17} color="var(--fg3)" />
            </span>
          </div>
          {open === m.init && (
            <div style={{ padding: '16px 24px 20px', background: 'var(--paper-100)', borderBottom: i === TEAM.length - 1 ? 'none' : '1px solid var(--border)' }}>
              <div className="r26-label" style={{ color: 'var(--fg3)', marginBottom: 12, fontSize: 10.5 }}>Répartition par projet</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 32px' }}>
                {(MEMBER_ALLOC[m.init] || []).map((a) => (
                  <div key={a.p}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{a.p}</span>
                      <span style={{ color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums' }}>{a.pct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
                      <div style={{ width: `${a.pct}%`, height: '100%', borderRadius: 4, background: 'var(--orange-500)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
              {m.load >= 85 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 12.5, color: 'var(--orange-700)', fontWeight: 600 }}>
                  <Icon name="alert-triangle" size={14} color="var(--orange-600)" /> Charge élevée — prévoir une réaffectation
                </div>
              )}
            </div>
          )}
          </React.Fragment>
        ))}
      </Card>
      )}
    </React.Fragment>
  );
}

// ---- Bibliothèque ----

const ASSETS = [
  { label: 'kv la pasta — rentrée', kind: 'KV' },
  { label: 'visuel ramadan — lanternes', kind: 'KV' },
  { label: 'film agl — still 01', kind: 'Film' },
  { label: 'teaser payboard — still', kind: 'Film' },
  { label: 'social bonnet rouge — bon matin', kind: 'Social' },
  { label: 'post produit — pasta pack', kind: 'Social' },
  { label: 'affiche ooh — agl', kind: 'Print' },
  { label: 'roll-up salon emploi', kind: 'Print' },
];

function AssetOverlay({ a, onClose }) {
  const PROJ = { KV: 'Campagne La Pasta', Social: 'Bonnet Rouge – Ramadan', Film: 'AGL – Brand Refresh', Print: 'Payboard – Teaser' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(22,19,16,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(860px, 100%)' }}>
      <Card pad={20} style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>{a.label}</span>
            <Chip variant="outline" style={{ fontSize: 11, padding: '3px 10px' }}>{a.kind}</Chip>
          </div>
          <IconBtn name="x" variant="cream" size={34} onClick={onClose} />
        </div>
        <div style={{
          aspectRatio: '16 / 8', borderRadius: 14,
          background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 10px, var(--paper-100) 10px 20px)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>{a.label} — aperçu haute définition</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--fg2)', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="folder" size={14} color="var(--fg3)" /> {PROJ[a.kind]}</span>
          <span style={{ fontSize: 13, color: 'var(--fg2)', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="file" size={14} color="var(--fg3)" /> PSD · 24,6 Mo</span>
          <span style={{ fontSize: 13, color: 'var(--fg2)', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Avatar initials="KA" size={22} tint="var(--orange-200)" /> Ajouté le 12 juin</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Button variant="ghost" icon="link" style={{ padding: '9px 16px', fontSize: 13.5, flexDirection: 'row-reverse' }}>Partager</Button>
            <Button variant="primary" icon="download" style={{ padding: '9px 16px', fontSize: 13.5, flexDirection: 'row-reverse' }}>Télécharger</Button>
          </span>
        </div>
      </Card>
      </div>
    </div>
  );
}

function MarquesView() {
  const byMarque = {};
  (window.PROJECTS || []).forEach((p) => { (byMarque[p.marque] = byMarque[p.marque] || []).push(p); });
  const marques = Object.entries(byMarque).sort((a, b) => b[1].length - a[1].length);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
      {marques.map(([marque, projs]) => {
        const client = projs[0].client;
        const col = clientColOf(client);
        const lateN = projs.filter(isLateP).length;
        const activeN = projs.filter(isActiveP).length;
        return (
          <Card key={marque}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: col, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{marque[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{marque}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>Client : {client}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Chip variant="soft" style={{ fontSize: 11.5, padding: '4px 11px' }}>{activeN} actifs</Chip>
                {lateN > 0 && <Chip variant="outline" style={{ fontSize: 11.5, padding: '4px 11px', color: '#B4472E', borderColor: '#B4472E' }}>{lateN} en retard</Chip>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projs.map((p, i) => (
                <div key={p.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUT_COL[p.statutRadar], flexShrink: 0 }}></span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{p.ndeg}</span>
                  <span style={{ fontSize: 12, color: isLateP(p) ? '#B4472E' : 'var(--fg3)', width: 54, textAlign: 'right' }}>{isLateP(p) ? `+${daysLateP(p)}j` : fmtDateP(p.deadline)}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function BibliothequePage() {
  const KINDS = ['Tous', 'KV', 'Social', 'Film', 'Print'];
  const [kind, setKind] = useState('Tous');
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('biblio');
  const shown = kind === 'Tous' ? ASSETS : ASSETS.filter((a) => a.kind === kind);
  return (
    <React.Fragment>
      <PageHead title="Bibliothèque" sub={mode === 'biblio' ? `${ASSETS.length} livrables archivés` : 'Clients & marques du portefeuille'} action={mode === 'biblio' ? 'Importer' : null} actionIcon="upload" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['biblio', 'Livrables'], ['marques', 'Marques']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            border: mode === k ? 'none' : '1.5px solid var(--border-strong)',
            background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {mode === 'marques' ? <MarquesView /> : (
        <React.Fragment>
          <FilterChips items={KINDS} active={kind} onChange={setKind} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {shown.map((a) => (
              <Card key={a.label} pad={12} onClick={() => setSel(a)} style={{ boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
                <div style={{
                  aspectRatio: '16 / 11', borderRadius: 12, marginBottom: 10,
                  background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 8px, var(--paper-100) 8px 16px)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, textAlign: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>{a.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 4px' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</span>
                  <Chip variant="outline" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, marginLeft: 8 }}>{a.kind}</Chip>
                </div>
              </Card>
            ))}
          </div>
          {sel && <AssetOverlay a={sel} onClose={() => setSel(null)} />}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

// ---- Équipe ----

const EVAL_DATA = {
  NM: { qualite: 92, delais: 88, volume: 76, note: 'Vision solide, cadrage client impeccable.' },
  LP: { qualite: 95, delais: 74, volume: 82, note: 'Direction artistique remarquable, à surveiller sur les délais.' },
  KA: { qualite: 84, delais: 70, volume: 94, note: 'Très productif, gros volume ; soutenir sur les pics.' },
  SD: { qualite: 90, delais: 91, volume: 68, note: 'Régulier et fiable, excellent sur le motion.' },
  MB: { qualite: 88, delais: 85, volume: 60, note: 'Copy précise, bonne tenue des échéances.' },
};

function EvalBar({ label, pct }) {
  const col = pct >= 88 ? '#1F8A5B' : pct >= 75 ? 'var(--orange-500)' : '#C99A5B';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: col }}>{pct}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: col }}></div>
      </div>
    </div>
  );
}

function MembreDetail({ m, i, onBack }) {
  const ev = EVAL_DATA[m.init] || { qualite: 80, delais: 80, volume: 80, note: '' };
  const score = Math.round((ev.qualite + ev.delais + ev.volume) / 3);
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <IconBtn name="arrow-left" variant="light" size={42} onClick={onBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials={m.init} size={64} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} style={{ fontSize: 22 }} />
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em' }}>{m.name}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14.5, color: 'var(--fg3)' }}>{m.role} · {m.projects} projets actifs</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <IconBtn name="mail" variant="cream" size={42} />
          <IconBtn name="message-circle" variant="cream" size={42} />
          <Button variant="dark" icon="calendar" style={{ flexDirection: 'row-reverse' }}>Planifier</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20, maxWidth: 1100 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Projets en cours</span>
            <LoadBar pct={m.load} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(MEMBER_ALLOC[m.init] || []).map((a) => (
              <div key={a.p}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{a.p}</span>
                  <span style={{ color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums' }}>{a.pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
                  <div style={{ width: `${a.pct}%`, height: '100%', borderRadius: 4, background: 'var(--orange-500)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ alignSelf: 'start' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Infos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, fontSize: 13.5, color: 'var(--fg2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="mail" size={15} color="var(--fg3)" /> {m.init.toLowerCase()}@agence.com</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="map-pin" size={15} color="var(--fg3)" /> Douala — Studio</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="clock" size={15} color="var(--fg3)" /> Membre depuis 2023</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }}></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Direction artistique', 'Branding', 'Social'].map((s) => <Chip key={s} variant="soft" style={{ fontSize: 11.5, padding: '4px 12px' }}>{s}</Chip>)}
          </div>
        </Card>
      </div>

      {/* Évaluation (additif) */}
      <Card style={{ marginTop: 20, maxWidth: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Évaluation · trimestre en cours</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--fg3)' }}>Score global</span>
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--orange-50)', color: 'var(--orange-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{score}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <EvalBar label="Qualité créative" pct={ev.qualite} />
          <EvalBar label="Respect des délais" pct={ev.delais} />
          <EvalBar label="Volume produit" pct={ev.volume} />
        </div>
        {ev.note && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'var(--surface-cream)', fontSize: 14, color: 'var(--fg2)', lineHeight: 1.55 }}>
            <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5, display: 'block', marginBottom: 5 }}>Appréciation du directeur créatif</span>
            {ev.note}
          </div>
        )}
      </Card>
    </React.Fragment>
  );
}

// ---- Utilisateurs (roster & rôles — projection UI de RADAR_AUTHZ_JSON, owner uniquement) ----
const USER_ROLES = { NM: 'owner', LP: 'supervisor' };
const ROLE_INFO = {
  owner: { label: 'Owner', chip: 'solid', desc: 'Tout + Direction privée + gestion des utilisateurs' },
  supervisor: { label: 'Supervisor', chip: 'ink', desc: 'Pilotage complet, sans la vue Direction privée' },
  member: { label: 'Member', chip: 'outline', desc: 'Verrouillé sur ses tâches — Todo & Focus' },
};
const ROSTER = TEAM.map((m, i) => ({
  ...m,
  login: m.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, ''),
  userRole: USER_ROLES[m.init] || 'member',
  actif: i !== TEAM.length - 1,
  derniere: ["aujourd'hui 09:12", 'hier 18:40', 'il y a 2 j', 'il y a 4 j', 'il y a 3 sem.'][Math.min(i, 4)],
}));

function UsersView() {
  const th = { fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' };
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--orange-50)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <Icon name="lock" size={15} color="var(--orange-700)" />
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg2)' }}>Vue réservée à l'owner. Le roster vit dans la config serveur (<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>RADAR_AUTHZ_JSON</span>) — cet écran en est la projection : les actions génèrent la config, le redéploiement l'applique.</span>
      </div>
      <Card pad={0} style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ flex: 2.2, ...th }}>Utilisateur</span>
          <span style={{ flex: 1.6, ...th }}>Rôle & accès</span>
          <span style={{ flex: 1.1, ...th }}>Dernière connexion</span>
          <span style={{ width: 82, ...th }}>Statut</span>
          <span style={{ width: 216, ...th, textAlign: 'right' }}>Actions</span>
        </div>
        {ROSTER.map((u, i) => (
          <div key={u.init} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 24px', borderBottom: i === ROSTER.length - 1 ? 'none' : '1px solid var(--border)', opacity: u.actif ? 1 : 0.55 }}>
            <span style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <Avatar initials={u.init} size={34} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} />
              <span style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', display: 'block' }}>{u.login}</span>
              </span>
            </span>
            <span style={{ flex: 1.6, minWidth: 0 }}>
              <Chip variant={ROLE_INFO[u.userRole].chip} style={{ fontSize: 10.5, padding: '3px 10px' }}>{ROLE_INFO[u.userRole].label}</Chip>
              <span style={{ fontSize: 11, color: 'var(--fg3)', display: 'block', marginTop: 3 }}>{ROLE_INFO[u.userRole].desc}</span>
            </span>
            <span style={{ flex: 1.1, fontSize: 12.5, color: 'var(--fg2)' }}>{u.derniere}</span>
            <span style={{ width: 82, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: u.actif ? '#1F8A5B' : 'var(--fg3)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.actif ? '#1F8A5B' : 'var(--border-strong)' }}></span>{u.actif ? 'Actif' : 'Désactivé'}
            </span>
            <span style={{ width: 216, display: 'inline-flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" icon="key-round" style={{ padding: '7px 12px', fontSize: 12 }}>Réinit. MDP</Button>
              <Button variant="ghost" icon={u.actif ? 'user-x' : 'user-check'} style={{ padding: '7px 12px', fontSize: 12 }}>{u.actif ? 'Désactiver' : 'Réactiver'}</Button>
            </span>
          </div>
        ))}
      </Card>
      <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.55 }}>Routage post-login : owner → Direction · supervisor → Vue d'ensemble · member → sa vue individuelle (Todo & Focus). La réinitialisation envoie un lien à usage unique, jamais un mot de passe en clair.</div>
    </React.Fragment>
  );
}

function EquipePage() {
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('membres');
  if (sel) return <MembreDetail m={sel.m} i={sel.i} onBack={() => setSel(null)} />;
  return (
    <React.Fragment>
      <PageHead title="Équipe" sub={mode === 'membres' ? `${TEAM.length} membres` : mode === 'users' ? 'Roster, rôles & accès — owner uniquement' : "Dossier d'évaluation — lecture collective"} action={mode === 'users' ? 'Inviter un utilisateur' : mode === 'membres' ? 'Ajouter un membre' : null} actionIcon="user-plus" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['membres', 'Membres'], ['dept', 'Éval département'], ['users', 'Utilisateurs']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            border: mode === k ? 'none' : '1.5px solid var(--border-strong)',
            background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {mode === 'dept' ? <EvalDeptView /> : mode === 'users' ? <UsersView /> : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {TEAM.map((m, i) => (
          <Card key={m.init} onClick={() => setSel({ m, i })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 28, cursor: 'pointer' }}>
            <Avatar initials={m.init} size={72} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} style={{ fontSize: 24 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginTop: 14 }}>{m.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--fg3)', marginTop: 3 }}>{m.role}</div>
            <Chip variant="soft" style={{ fontSize: 11.5, padding: '4px 12px', marginTop: 12 }}>{m.projects} projets actifs</Chip>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <IconBtn name="mail" variant="cream" size={36} />
              <IconBtn name="message-circle" variant="cream" size={36} />
              <IconBtn name="calendar" variant="cream" size={36} />
            </div>
          </Card>
        ))}
      </div>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { RessourcesPage, BibliothequePage, EquipePage, TEAM });
