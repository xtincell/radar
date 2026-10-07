// Dashboard R26 × Radar — nouveaux onglets Direction & Wiki (additifs)

// ---- Direction : vue macro pour le directeur créatif ----

function DirectionPage() {
  const projs = window.PROJECTS || [];
  const active = projs.filter(isActiveP);
  const late = active.filter(isLateP);
  const p0 = active.filter((p) => p.prio === 'P0');
  const closed = projs.filter((p) => CLOSED_RADAR.has(p.statutRadar)).length;
  const rate = projs.length ? Math.round((closed / projs.length) * 100) : 0;

  // santé par client
  const byClient = {};
  active.forEach((p) => { (byClient[p.client] = byClient[p.client] || []).push(p); });
  const clients = Object.entries(byClient).sort((a, b) => b[1].length - a[1].length);

  const KPI = ({ v, label, tone }) => {
    const col = tone === 'alert' ? '#B4472E' : tone === 'warn' ? 'var(--orange-600)' : tone === 'go' ? '#1F8A5B' : 'var(--fg1)';
    return (
      <Card pad={20}>
        <div className="r26-stat" style={{ fontSize: 38, lineHeight: 1.05, color: col }}>{v}</div>
        <div style={{ fontSize: 13, color: 'var(--fg3)', marginTop: 6 }}>{label}</div>
      </Card>
    );
  };

  const health = (arr) => {
    const l = arr.filter(isLateP).length;
    if (l >= 2) return { label: 'Sous pression', col: '#B4472E' };
    if (l === 1) return { label: 'À surveiller', col: '#C99A5B' };
    return { label: 'Sain', col: '#1F8A5B' };
  };

  return (
    <React.Fragment>
      <header style={{ marginBottom: 22 }}>
        <div className="r26-label" style={{ color: 'var(--orange-600)', marginBottom: 6 }}>Direction créative · vue macro</div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '-0.01em' }}>Direction</h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--fg3)' }}>Pilotage du portefeuille et santé des comptes.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPI v={active.length} label="Projets actifs" />
        <KPI v={late.length} label="En retard" tone="alert" />
        <KPI v={p0.length} label="Priorité P0" tone="warn" />
        <KPI v={`${rate}%`} label="Taux de traitement" tone="go" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <CardHead title="Santé par client" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {clients.map(([c, arr], i) => {
              const h = health(arr);
              return (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: clientColOf(c), flexShrink: 0 }}></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{arr.length} projet{arr.length > 1 ? 's' : ''} actif{arr.length > 1 ? 's' : ''}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: h.col }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.col }}></span>{h.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Décisions à prendre" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...late, ...p0.filter((p) => !isLateP(p))].slice(0, 6).map((p, i) => (
              <div key={p.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <Icon name={isLateP(p) ? 'alert-triangle' : 'flag'} size={16} color={isLateP(p) ? '#B4472E' : 'var(--orange-600)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{isLateP(p) ? `Retard de ${daysLateP(p)}j · arbitrage ressources` : 'Priorité absolue · valider le cadrage'}</div>
                </div>
                <Chip variant={isLateP(p) ? 'outline' : 'solid'} style={{ fontSize: 10.5, padding: '3px 10px', flexShrink: 0, ...(isLateP(p) ? { color: '#B4472E', borderColor: '#B4472E' } : {}) }}>{isLateP(p) ? 'Retard' : 'P0'}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Mur des travaux récents (visuels de livrables) */}
      <Card style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Mur des travaux récents</span>
          <span style={{ fontSize: 12, color: 'var(--fg3)' }}>derniers visuels livrés — glisser une image pour remplir</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {(window.PROJECTS || []).slice(0, 6).map((p) => (
            <div key={p.ndeg} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <image-slot id={`mur-${p.ndeg}`} shape="rounded" radius="12" placeholder={p.marque} style={{ width: '100%', height: 110 }}></image-slot>
              <span style={{ fontSize: 11.5, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: clientColOf(p.client), flexShrink: 0 }}></span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </React.Fragment>
  );
}

// ---- Wiki : documentation & process de l'agence ----

const WIKI = [
  { cat: 'Process', icon: 'git-branch', docs: [
    { t: 'Cycle de vie d’un brief', d: 'De la réception à l’archivage : statuts, responsabilités, jalons.', maj: '08 juil.' },
    { t: 'Circuit de validation client', d: 'Nombre de allers-retours, gel des versions, signature.', maj: '02 juil.' },
    { t: 'Gestion des priorités (P0–P2)', d: 'Comment qualifier l’urgence et arbitrer la charge.', maj: '28 juin' },
  ]},
  { cat: 'Charte & gabarits', icon: 'palette', docs: [
    { t: 'Charte graphique agence', d: 'Logo, couleurs, typographies, règles d’usage.', maj: '15 juin' },
    { t: 'Gabarits par format', d: 'Social, print, OOH, film : dimensions et zones de sécurité.', maj: '10 juin' },
    { t: 'Nomenclature des fichiers', d: 'Convention de nommage des livrables et exports.', maj: '05 juin' },
  ]},
  { cat: 'Outils & ressources', icon: 'wrench', docs: [
    { t: 'Banque d’assets partagés', d: 'Où trouver polices, pictos, mockups et licences.', maj: '01 juil.' },
    { t: 'Checklist avant livraison', d: 'Contrôle qualité : relecture, formats, poids, exports.', maj: '20 juin' },
  ]},
];

function WikiPage() {
  const [q, setQ] = useState('');
  const filtered = WIKI.map((s) => ({ ...s, docs: s.docs.filter((d) => (d.t + d.d).toLowerCase().includes(q.toLowerCase())) })).filter((s) => s.docs.length);
  return (
    <React.Fragment>
      <PageHead title="Wiki" sub="Documentation, process et gabarits de l'agence" action="Nouvel article" actionIcon="plus" />
      <div style={{ position: 'relative', maxWidth: 460, marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Icon name="search" size={16} color="var(--fg3)" /></span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un article…"
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '11px 16px 11px 42px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', background: 'var(--paper-100)', color: 'var(--fg1)' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {filtered.map((s) => (
          <div key={s.cat}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={16} color="var(--orange-600)" /></span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{s.cat}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {s.docs.map((d) => (
                <Card key={d.t} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{d.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.5, flex: 1 }}>{d.d}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Icon name="clock" size={12} /> Mis à jour le {d.maj}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {!filtered.length && <Card tone="cream" style={{ padding: 40, textAlign: 'center', color: 'var(--fg3)' }}>Aucun article ne correspond.</Card>}
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DirectionPage, WikiPage });
