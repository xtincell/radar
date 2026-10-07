// Dashboard R26 — Rapports page (filtres de période + répartition par type)

const PERIODS = {
  'S1 2025': {
    months: [{ m: 'Jan', v: 9 }, { m: 'Fév', v: 12 }, { m: 'Mar', v: 8 }, { m: 'Avr', v: 15 }, { m: 'Mai', v: 18 }, { m: 'Juin', v: 14 }],
    hl: 'Mai',
    kpis: [
      { label: 'Livrables produits', value: 76, icon: 'package', note: 'sur la période' },
      { label: 'Délai moyen', value: '6,2 j', icon: 'timer', note: 'par livrable' },
      { label: 'Taux de validation', value: '91%', icon: 'thumbs-up', note: 'premier envoi' },
    ],
    clients: [
      { name: 'La Pasta', n: 21, pct: 88 }, { name: 'Bonnet Rouge', n: 18, pct: 75 },
      { name: 'AGL', n: 14, pct: 58 }, { name: 'Payboard', n: 9, pct: 38 },
    ],
    types: [
      { t: 'Social', pct: 38 }, { t: 'KV / Print', pct: 27 }, { t: 'Film', pct: 20 }, { t: 'Digital', pct: 15 },
    ],
  },
  'S2 2024': {
    months: [{ m: 'Juil', v: 11 }, { m: 'Août', v: 6 }, { m: 'Sep', v: 13 }, { m: 'Oct', v: 16 }, { m: 'Nov', v: 12 }, { m: 'Déc', v: 10 }],
    hl: 'Oct',
    kpis: [
      { label: 'Livrables produits', value: 68, icon: 'package', note: 'sur la période' },
      { label: 'Délai moyen', value: '7,1 j', icon: 'timer', note: 'par livrable' },
      { label: 'Taux de validation', value: '86%', icon: 'thumbs-up', note: 'premier envoi' },
    ],
    clients: [
      { name: 'Bonnet Rouge', n: 22, pct: 90 }, { name: 'La Pasta', n: 16, pct: 66 },
      { name: 'Payboard', n: 12, pct: 50 }, { name: 'AGL', n: 8, pct: 33 },
    ],
    types: [
      { t: 'Social', pct: 42 }, { t: 'KV / Print', pct: 24 }, { t: 'Digital', pct: 19 }, { t: 'Film', pct: 15 },
    ],
  },
  'Année 2024': {
    months: [{ m: 'T1', v: 28 }, { m: 'T2', v: 31 }, { m: 'T3', v: 30 }, { m: 'T4', v: 38 }],
    hl: 'T4',
    kpis: [
      { label: 'Livrables produits', value: 127, icon: 'package', note: 'sur l’année' },
      { label: 'Délai moyen', value: '6,8 j', icon: 'timer', note: 'par livrable' },
      { label: 'Taux de validation', value: '88%', icon: 'thumbs-up', note: 'premier envoi' },
    ],
    clients: [
      { name: 'Bonnet Rouge', n: 41, pct: 92 }, { name: 'La Pasta', n: 34, pct: 76 },
      { name: 'Payboard', n: 22, pct: 49 }, { name: 'AGL', n: 18, pct: 40 },
    ],
    types: [
      { t: 'Social', pct: 40 }, { t: 'KV / Print', pct: 25 }, { t: 'Film', pct: 18 }, { t: 'Digital', pct: 17 },
    ],
  },
};

function BarChart({ data, hl }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, height: 220, padding: '0 8px' }}>
      {data.map((d) => {
        const isHl = d.m === hl;
        return (
          <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isHl ? 'var(--orange-600)' : 'var(--fg2)' }}>{d.v}</span>
            <div style={{
              width: '100%', maxWidth: 52, borderRadius: 12,
              height: `${(d.v / max) * 100}%`, minHeight: 20,
              background: isHl ? 'var(--orange-500)' : 'var(--ink-950)',
              boxShadow: isHl ? 'var(--shadow-orange)' : 'none',
              transition: 'height var(--dur-slow) var(--ease-out)',
            }}></div>
            <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

function TypeSplit({ types }) {
  const colors = ['var(--orange-500)', 'var(--ink-950)', 'var(--orange-200)', 'var(--border-strong)'];
  return (
    <React.Fragment>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: 3, marginTop: 6 }}>
        {types.map((s, i) => (
          <div key={s.t} style={{ width: `${s.pct}%`, background: colors[i], borderRadius: 7, transition: 'width var(--dur-slow) var(--ease-out)' }}></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px', marginTop: 18 }}>
        {types.map((s, i) => (
          <div key={s.t} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors[i], flexShrink: 0 }}></span>
            <span style={{ flex: 1, color: 'var(--fg2)' }}>{s.t}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

function BilanView() {
  const wins = [
    'Payboard – Teaser Launch livré et validé (n° PBD-003).',
    'La Pasta Visuel 2 : piste retenue par le client, déclinaisons lancées.',
    'Taux de validation au premier envoi remonté à 91 %.',
  ];
  const watch = [
    'AGL – Film corporate en retard (montage) — relance monteur.',
    'La Pasta – Recette du mois bloquée : visuels packaging manquants.',
    'Charge de Karim à 94 % — prévoir un reéquilibrage.',
  ];
  const next = [
    'Boucler le film Ramadan Bonnet Rouge avant la fin du mois.',
    'Produire les déclinaisons OOH AGL.',
    'Lancer le packaging Bonnet Rouge (P0).',
  ];
  const Blk = ({ icon, col, title, items }) => (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: col + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={17} color={col} /></span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>{title}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, marginTop: 7, flexShrink: 0 }}></span>{t}
          </li>
        ))}
      </ul>
    </Card>
  );
  return (
    <React.Fragment>
      <Card tone="cream" pad={24} style={{ marginBottom: 20 }}>
        <div className="r26-label" style={{ color: 'var(--orange-600)', marginBottom: 8 }}>Synthèse · semaine en cours</div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--fg1)', maxWidth: 760 }}>
          Semaine dense côté production : <strong>4 projets actifs</strong>, un livrable validé et deux points de vigilance sur les délais. Le portefeuille reste maîtrisé mais la charge se concentre sur La Pasta et AGL.
        </p>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <Blk icon="trophy" col="#1F8A5B" title="Réussites" items={wins} />
        <Blk icon="alert-triangle" col="#B4472E" title="Points de vigilance" items={watch} />
        <Blk icon="arrow-right" col="var(--orange-600)" title="Priorités à venir" items={next} />
      </div>
    </React.Fragment>
  );
}

function FaitsView() {
  const faits = [
    { d: '11 juil.', who: 'NM', t: 'Payboard – Teaser validé par le client', tag: 'Validation', col: '#1F8A5B' },
    { d: '10 juil.', who: 'LP', t: 'La Pasta – Visuel 2 : piste retenue', tag: 'Jalon', col: 'var(--orange-500)' },
    { d: '09 juil.', who: 'SD', t: 'Bonnet Rouge – Newsletter Q3 envoyée pour intégration', tag: 'Livraison', col: '#7A2E86' },
    { d: '08 juil.', who: 'KA', t: 'La Pasta – Recette du mois passée en bloqué', tag: 'Blocage', col: '#B4472E' },
    { d: '05 juil.', who: 'NM', t: 'AGL – Film corporate : démarrage du montage', tag: 'Jalon', col: 'var(--orange-500)' },
    { d: '02 juil.', who: 'MB', t: 'AGL – Brand Refresh : charte validée en interne', tag: 'Validation', col: '#1F8A5B' },
  ];
  return (
    <Card style={{ maxWidth: 820 }}>
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        {faits.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i === faits.length - 1 ? 0 : 22, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: f.col, border: '3px solid var(--surface-card, #fff)', boxShadow: '0 0 0 1px var(--border)', zIndex: 1 }}></span>
              {i !== faits.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 2 }}></span>}
            </div>
            <div style={{ flex: 1, paddingBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums', width: 58 }}>{f.d}</span>
                <Chip variant="outline" style={{ fontSize: 10.5, padding: '2px 9px', color: f.col, borderColor: f.col }}>{f.tag}</Chip>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                <Avatar initials={f.who} size={24} tint="var(--orange-200)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{f.t}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RapportsPage() {
  const [period, setPeriod] = useState('S1 2025');
  const [mode, setMode] = useState('analyse');
  const data = PERIODS[period];
  const subByMode = { analyse: `Performance créative — ${period}`, bilan: 'Synthèse de la période', faits: 'Journal des jalons et livraisons' };
  return (
    <React.Fragment>
      <PageHead title="Rapports" sub={subByMode[mode]} action="Exporter" actionIcon="download" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['analyse', 'Analyse'], ['bilan', 'Bilan'], ['faits', 'Faits marquants']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            border: mode === k ? 'none' : '1.5px solid var(--border-strong)',
            background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {mode === 'bilan' ? <BilanView /> : mode === 'faits' ? <FaitsView /> : (
      <React.Fragment>
      <FilterChips items={Object.keys(PERIODS)} active={period} onChange={setPeriod} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        {data.kpis.map((k) => (
          <Card key={k.label} pad={22} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <span style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={k.icon} size={21} color="var(--orange-600)" />
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg2)' }}>{k.label}</div>
              <div className="r26-stat" style={{ fontSize: 34, lineHeight: 1.15, marginTop: 2 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4 }}>{k.note}</div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
        <Card>
          <CardHead title="Livrables par période" />
          <BarChart data={data.months} hl={data.hl} />
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardHead title="Volume par client" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 2 }}>
              {data.clients.map((c) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums' }}>{c.n} livrables</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--paper-200)', overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 4, background: 'var(--orange-500)', transition: 'width var(--dur-slow) var(--ease-out)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="Répartition par type" />
            <TypeSplit types={data.types} />
          </Card>
        </div>
      </div>
      </React.Fragment>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { RapportsPage });
