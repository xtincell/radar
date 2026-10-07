// Dashboard R26 × Radar — Studio : wiki éditorial × DAM.
// Absorbe Bibliothèque + Marques. Marques → projets → fiche éditoriale
// (mockups en slots réels, dossier 4 volets, case study, révisions liées aux
// tickets .Rn) + Palmarès (publié / tous, par marché) + Import simulé
// (naming + destination dérivés du ticket).

// Métadonnées de publication par projet (clé = n° de ticket)
const STUDIO_META = {
  'PAN-014': { publie: false, marche: 'Cameroun', curation: 8.2, revisions: [
    { rn: 'PAN-014.R1', date: '02 juil. 2026', note: 'Retour client : logo plus présent, palette réchauffée sur le KV.' },
    { rn: 'PAN-014.R2', date: '08 juil. 2026', note: 'Piste « Table de rentrée » retenue — déclinaisons lancées.' },
  ]},
  'BNR-021': { publie: true, marche: 'Cameroun', curation: 9.0, revisions: [
    { rn: 'BNR-021.R1', date: '20 juin 2026', note: 'Board : resserrer sur les gestes, moins de plans larges.' },
  ]},
  'AGL-007': { publie: false, marche: "Côte d'Ivoire", curation: 7.1, revisions: [] },
  'PBD-003': { publie: true, marche: 'Cameroun', curation: 9.4, revisions: [
    { rn: 'PBD-003.R1', date: '10 juin 2026', note: 'Version carrée ajoutée pour le feed à la demande du CEO.' },
  ]},
  'BNR-024': { publie: false, marche: 'Cameroun', curation: 6.5, revisions: [] },
  'AGL-009': { publie: true, marche: "Côte d'Ivoire", curation: 7.8, revisions: [
    { rn: 'AGL-009.R1', date: '05 juil. 2026', note: 'Montage v2 : voix-off réenregistrée, sous-titres anglais.' },
  ]},
};
const stMeta = (p) => STUDIO_META[p.ndeg] || { publie: false, marche: p.pays || '—', curation: 6, revisions: [] };

// score palmarès : KPI engagement du case study si publié + documenté, sinon note de curation
function stScore(p) {
  const cs = ((window.GABARIT_DATA || {})[p.ndeg] || {}).cs || {};
  const m = /([\d.,]+)\s*%/.exec(cs.kpi_taux_eng || cs.kpi_engagement || '');
  if (m) return { val: Math.min(10, parseFloat(m[1].replace(',', '.')) * 1.3), src: 'KPI' };
  return { val: stMeta(p).curation, src: 'curation' };
}

function stVoletPct(ndeg, key) {
  const data = (((window.GABARIT_DATA || {})[ndeg]) || {})[key];
  const sections = (window.GABARIT_SCHEMA || {})[key] || [];
  let tot = 0, ok = 0;
  sections.forEach((s) => s.fields.forEach(([k]) => { tot++; const v = (data || {})[k]; if (v != null && (Array.isArray(v) ? v.length : String(v).trim() !== '')) ok++; }));
  return tot ? Math.round((ok / tot) * 100) : 0;
}

function StPubChip({ p }) {
  const m = stMeta(p);
  return m.publie
    ? <Chip variant="solid" style={{ fontSize: 10.5, padding: '3px 10px' }}>Publié</Chip>
    : <Chip variant="outline" style={{ fontSize: 10.5, padding: '3px 10px' }}>Non publié</Chip>;
}

// ---- Fiche projet éditoriale ----
function StProjetFiche({ p, onBack }) {
  const m = stMeta(p);
  const dossier = (window.GABARIT_DATA || {})[p.ndeg];
  const client = (dossier || {}).client || {};
  const crea = (dossier || {}).crea || {};
  const cs = (dossier || {}).cs || {};
  const VOLS = [['client', 'Brief client'], ['crea', 'Brief créa / DA'], ['prod', 'Production'], ['cs', 'Case study']];
  const kpis = [['Portée', cs.kpi_portee], ['Engagement', cs.kpi_taux_eng || cs.kpi_engagement], ['Leads', cs.kpi_leads], ['Sentiment', cs.kpi_sentiment]].filter(([, v]) => v);
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
        <IconBtn name="arrow-left" variant="light" size={42} onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)', background: 'var(--paper-100)', padding: '3px 9px', borderRadius: 6 }}>{p.ndeg}</span>
            <StPubChip p={p} />
            <Chip variant="soft" style={{ fontSize: 10.5, padding: '3px 10px' }}>{m.marche}</Chip>
          </div>
          <h1 style={{ margin: '7px 0 0', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em' }}>{p.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client) }}></span>{p.client} · {p.marque} · {p.type}
          </p>
        </div>
        <Button variant="dark" icon="maximize-2" onClick={() => { window.__gabaritOpen = p.ndeg; if (window.appNavigate) window.appNavigate('Gabarits'); }} style={{ flexDirection: 'row-reverse' }}>Dossier complet</Button>
      </div>

      {/* mockups de présentation */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <image-slot id={`st-${p.ndeg}-kv`} shape="rounded" radius="16" placeholder={`KV maître — ${p.marque}`} style={{ width: '100%', height: 300 }}></image-slot>
        {['4:5', '9:16', 'mockup'].map((f, i) => (
          <div key={f} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <image-slot id={`st-${p.ndeg}-d${i}`} shape="rounded" radius="14" placeholder={`Déclinaison ${f}`} style={{ width: '100%', height: 300 }}></image-slot>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* l'histoire (éditorial) */}
          <Card>
            <div className="r26-label" style={{ color: 'var(--orange-600)', marginBottom: 10 }}>L'histoire</div>
            {client.big_idea && <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 8 }}>« {crea.message_claim || client.big_idea} »</div>}
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg2)' }}>
              {cs.challenge || client.probleme_marketing || 'Dossier à documenter dans Gabarits.'}
            </p>
            {kpis.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                {kpis.map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{v}</div></div>
                ))}
              </div>
            )}
          </Card>
          {/* révisions liées aux tickets */}
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 12 }}>Révisions</div>
            {m.revisions.length ? m.revisions.map((r, i) => (
              <div key={r.rn} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--orange-700)', background: 'var(--orange-50)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', flexShrink: 0, alignSelf: 'flex-start' }}>{r.rn}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, display: 'block', lineHeight: 1.5 }}>{r.note}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{r.date} · générée par le ticket</span>
                </span>
              </div>
            )) : <div style={{ fontSize: 13, color: 'var(--fg3)', fontStyle: 'italic' }}>Aucune révision — le master est la version courante.</div>}
          </Card>
        </div>
        {/* dossier 4 volets */}
        <Card style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 12 }}>Dossier</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {VOLS.map(([k, l]) => {
              const pct = stVoletPct(p.ndeg, k);
              return (
                <div key={k} onClick={() => { window.__gabaritOpen = p.ndeg; if (window.appNavigate) window.appNavigate('Gabarits'); }} style={{ cursor: 'pointer', padding: '10px 13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--paper-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                    <span>{l}</span><span style={{ color: pct >= 100 ? '#1F8A5B' : pct > 0 ? 'var(--orange-700)' : 'var(--fg3)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--paper-200)', overflow: 'hidden', marginTop: 7 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#1F8A5B' : 'var(--orange-500)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg3)', lineHeight: 1.5 }}>
            Rangement serveur : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>/Clients/{p.client}/2026/{p.ndeg}/</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <StakeStrip client={p.client} />
          </div>
        </Card>
      </div>
    </React.Fragment>
  );
}

// ---- Marques ----
function StMarquesView({ onOpen }) {
  const byMarque = {};
  (window.PROJECTS || []).forEach((p) => { (byMarque[p.marque] = byMarque[p.marque] || []).push(p); });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
      {Object.entries(byMarque).sort((a, b) => b[1].length - a[1].length).map(([marque, projs]) => {
        const client = projs[0].client;
        const col = clientColOf(client);
        const pubN = projs.filter((p) => stMeta(p).publie).length;
        return (
          <Card key={marque}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, background: col, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{marque[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{marque}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{client} · {projs.length} projets · {pubN} publié{pubN > 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {projs.slice(0, 3).map((p) => (
                <image-slot key={p.ndeg} id={`st-thumb-${p.ndeg}`} shape="rounded" radius="10" placeholder={p.ndeg} style={{ width: '100%', height: 74 }}></image-slot>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projs.map((p, i) => (
                <div key={p.ndeg} onClick={() => onOpen(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUT_COL[p.statutRadar], flexShrink: 0 }}></span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                  <StPubChip p={p} />
                  <Icon name="chevron-right" size={14} color="var(--fg3)" />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---- Palmarès ----
function StPalmaresView({ onOpen }) {
  const [scope, setScope] = useState('publie');
  const [marche, setMarche] = useState('Tous');
  const all = (window.PROJECTS || []);
  const marches = ['Tous', ...new Set(all.map((p) => stMeta(p).marche))];
  const shown = all
    .filter((p) => scope === 'tous' || stMeta(p).publie)
    .filter((p) => marche === 'Tous' || stMeta(p).marche === marche)
    .map((p) => ({ p, s: stScore(p) }))
    .sort((a, b) => b.s.val - a.s.val);
  return (
    <React.Fragment>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', gap: 4, background: 'var(--paper-100)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
          {[['publie', 'Publiés'], ['tous', 'Publiés + non publiés']].map(([k, l]) => (
            <button key={k} onClick={() => setScope(k)} style={{ border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill)', padding: '7px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', background: scope === k ? 'var(--ink-950)' : 'transparent', color: scope === k ? '#fff' : 'var(--fg2)' }}>{l}</button>
          ))}
        </span>
        {marches.map((mk) => (
          <button key={mk} onClick={() => setMarche(mk)} style={{ border: marche === mk ? 'none' : '1.5px solid var(--border-strong)', background: marche === mk ? 'var(--ink-950)' : 'transparent', color: marche === mk ? '#fff' : 'var(--fg2)', padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600 }}>{mk}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map(({ p, s }, i) => (
          <Card key={p.ndeg} onClick={() => onOpen(p)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', padding: 18 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: i === 0 ? 'var(--orange-600)' : 'var(--fg3)', width: 34, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <image-slot id={`st-palm-${p.ndeg}`} shape="rounded" radius="10" placeholder={p.marque} style={{ width: 96, height: 64, flexShrink: 0 }}></image-slot>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(p.client) }}></span>{p.marque} · {stMeta(p).marche}
              </div>
            </div>
            <StPubChip p={p} />
            <span style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{s.val.toFixed(1)}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--fg3)' }}>{s.src === 'KPI' ? 'score KPI' : 'curation'}</span>
            </span>
          </Card>
        ))}
      </div>
    </React.Fragment>
  );
}

// ---- Import simulé (pipeline Drive) ----
function StImportView() {
  const briefs = (window.PROJECTS || []);
  const [tk, setTk] = useState(briefs[0] ? briefs[0].ndeg : '');
  const [kind, setKind] = useState('KV');
  const [fname, setFname] = useState('visuel-final-OK-v3(1).psd');
  const [ranges, setRanges] = useState([]);
  const p = briefs.find((b) => b.ndeg === tk);
  const KINDS = ['KV', 'Déclinaison', 'Mockup', 'Film', 'Document'];
  const SUBDIR = { KV: '03_Livrables/KV', 'Déclinaison': '03_Livrables/Declinaisons', Mockup: '04_Presentation/Mockups', Film: '03_Livrables/Film', Document: '01_Briefs' };
  const version = p ? (stMeta(p).revisions.length + 1) : 1;
  const ext = (fname.match(/\.[a-z0-9]+$/i) || ['.psd'])[0];
  const proposedName = p ? `${p.ndeg.replace('-', '')}_${kind.normalize('NFD').replace(/[^\w]/g, '')}_v${version}${ext}` : '';
  const proposedPath = p ? `/Clients/${p.client}/2026/${p.ndeg}/${SUBDIR[kind]}/` : '';
  const inputStyle2 = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--paper-50)', padding: '11px 13px', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--fg1)', outline: 'none', width: '100%' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <Card>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Déposer un asset</div>
        <div style={{ fontSize: 12.5, color: 'var(--fg3)', marginBottom: 16, lineHeight: 1.5 }}>Le système lit le ticket, renomme et range automatiquement — le nom d'origine n'a aucune importance.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="r26-label" style={{ fontSize: 10.5, color: 'var(--fg3)' }}>Fichier reçu (nom d'origine)</span>
            <input value={fname} onChange={(e) => setFname(e.target.value)} style={inputStyle2} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="r26-label" style={{ fontSize: 10.5, color: 'var(--fg3)' }}>Ticket associé (obligatoire — pas de ticket, pas d'asset)</span>
            <select value={tk} onChange={(e) => setTk(e.target.value)} style={inputStyle2}>{briefs.map((b) => <option key={b.ndeg} value={b.ndeg}>{b.ndeg} · {b.title}</option>)}</select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="r26-label" style={{ fontSize: 10.5, color: 'var(--fg3)' }}>Nature</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle2}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
        </div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--ink-950)', color: '#F7F2EA' }}>
          <div className="r26-label" style={{ color: 'rgba(247,242,234,0.5)', fontSize: 10, marginBottom: 8 }}>Proposition du système</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, wordBreak: 'break-all' }}>
            <span style={{ color: 'var(--orange-300, #FFAA6E)' }}>{proposedName}</span><br />
            <span style={{ opacity: 0.65 }}>{proposedPath}</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Button variant="primary" icon="check" onClick={() => setRanges([{ name: proposedName, path: proposedPath, when: "À l'instant" }, ...ranges])} style={{ flexDirection: 'row-reverse' }}>Valider le rangement</Button>
        </div>
      </Card>
      <Card>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 12 }}>Derniers rangés</div>
        {ranges.length ? ranges.map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', marginTop: 2, wordBreak: 'break-all' }}>{r.path} · {r.when}</div>
          </div>
        )) : <div style={{ fontSize: 13, color: 'var(--fg3)', fontStyle: 'italic' }}>Rien d'importé dans cette session.</div>}
      </Card>
    </div>
  );
}

function StudioPage() {
  const [view, setView] = useState('marques');
  const [sel, setSel] = useState(null);
  if (sel) return <StProjetFiche p={sel} onBack={() => setSel(null)} />;
  const SUBS = { marques: 'Marques, projets et assets — le portfolio vivant de l\'agence', palmares: 'Les meilleurs projets, calculés sur les KPIs publiés ou la curation', import: 'Dépose un fichier — le ticket décide du nom et du rangement' };
  return (
    <React.Fragment>
      <PageHead title="Studio" sub={SUBS[view]} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['marques', 'Marques'], ['palmares', 'Palmarès'], ['import', 'Import']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            border: view === k ? 'none' : '1.5px solid var(--border-strong)',
            background: view === k ? 'var(--ink-950)' : 'transparent', color: view === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {view === 'marques' ? <StMarquesView onOpen={setSel} /> : view === 'palmares' ? <StPalmaresView onOpen={setSel} /> : <StImportView />}
    </React.Fragment>
  );
}

Object.assign(window, { StudioPage });
