// Dashboard R26 × Radar — Ticket : création de projet / révision / tâche

const TICKET_CATS = [
  { cat: 'Création · Key Visual / DA', resp: 'Laure Pemha' },
  { cat: 'Création · Édition', resp: 'Marc Biya' },
  { cat: 'Création · Packaging / Impression', resp: 'Karim Abanda' },
  { cat: 'Création · Motion / Vidéo', resp: 'Sarah Dikongue' },
  { cat: 'Stratégie / Planning', resp: 'Nelson Metougue' },
  { cat: 'Digital / Social media', resp: 'Karim Abanda' },
];
const TICKET_TYPES = ['Création KV', 'Packaging', 'DA Campaign', 'Production vidéo', 'Stratégie', 'Modification', 'Pitch', 'Autre'];
const CLIENT_PREFIX = { 'Panza Foods': 'PAN', 'Bonnet Rouge': 'BNR', 'AGL': 'AGL', 'Payboard': 'PBD', 'Cacao Sud': 'CAC', 'Wouri Brasserie': 'WOU', 'Éburnéa': 'EBU' };

function tField(label, req, children) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>{label}{req && <span style={{ color: '#B4472E' }}> *</span>}</label>
      {children}
    </div>
  );
}

const inputStyle = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md, 12px)', background: 'var(--paper-50)', padding: '11px 13px', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--fg1)', outline: 'none', width: '100%' };

function TicketPage() {
  const [mode, setMode] = useState('proj'); // proj | rev | task
  const [client, setClient] = useState('');
  const [parent, setParent] = useState('');
  const [projet, setProjet] = useState('');
  const [cat, setCat] = useState(TICKET_CATS[0].cat);
  const [type, setType] = useState(TICKET_TYPES[0]);
  const [prio, setPrio] = useState('P1');
  const [statut, setStatut] = useState('Reçu');
  const [resp, setResp] = useState(TICKET_CATS[0].resp);
  const [entrePar, setEntrePar] = useState('Coordination');
  const [marque, setMarque] = useState('');
  const [niveau, setNiveau] = useState('Production');
  const [cluster, setCluster] = useState('');
  const [pays, setPays] = useState('');
  const [cart, setCart] = useState([]);
  const [aiSrc, setAiSrc] = useState('');
  const [aiPhase, setAiPhase] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const runAI = () => {
    if (aiPhase) return;
    setAiResult(null);
    setAiPhase('Extraction…');
    setTimeout(() => setAiPhase('Vérification (passe 2)…'), 900);
    setTimeout(() => setAiPhase('Passe ciblée (champs douteux)…'), 1900);
    setTimeout(() => {
      setAiPhase('');
      setMode('proj'); setClient('Bonnet Rouge'); setProjet('Poster annonce nouveau format 33cl');
      setCat('Création · Packaging / Impression'); setResp('Karim Abanda'); setType('Packaging');
      setPrio('P0'); setEntrePar('Direction'); setMarque('Bonnet Rouge'); setPays('Cameroun');
      setAiResult({
        confidence: [['client', 0.98], ['projet', 0.92], ['type', 0.88], ['prio', 0.72], ['responsable', 0.55]],
        issues: ['Deadline absente de la source — champ laissé vide.'],
      });
    }, 2800);
  };

  const clients = Object.keys(CLIENT_PREFIX);
  const masters = ALL_BRIEFS.filter((b) => b.ndeg);

  // next code (per-client counter for projects; parent.Rn for revisions)
  const nextCode = () => {
    if (mode === 'proj') {
      const pre = CLIENT_PREFIX[client]; if (!pre) return '—';
      let max = 0;
      ALL_BRIEFS.concat(cart.map((c) => ({ ndeg: c.code }))).forEach((b) => {
        const m = (b.ndeg || '').match(new RegExp(`^${pre}-(\\d+)$`)); if (m) max = Math.max(max, +m[1]);
      });
      return `${pre}-${String(max + 1).padStart(3, '0')}`;
    }
    if (!parent) return '—';
    let max = 0;
    ALL_BRIEFS.concat(cart.map((c) => ({ ndeg: c.code, parent: c.parent }))).forEach((b) => {
      const m = (b.ndeg || '').match(new RegExp(`^${parent}\\.R(\\d+)$`)); if (m) max = Math.max(max, +m[1]);
    });
    return `${parent}.R${max + 1}`;
  };
  const code = nextCode();
  const missing = [];
  if (code === '—') missing.push(mode === 'proj' ? 'client' : 'projet parent');
  if (!projet.trim()) missing.push('intitulé');
  const ok = missing.length === 0;

  const add = () => {
    if (!ok) return;
    setCart([...cart, { code, parent: mode === 'proj' ? '' : parent, projet: projet.trim(), client: mode === 'proj' ? client : (masters.find((m) => m.ndeg === parent) || {}).client, type, prio, statut, resp, entree: mode === 'proj' ? 'Maître' : mode === 'rev' ? 'Révision' : 'Tâche' }]);
    setProjet('');
  };
  const removeItem = (i) => setCart(cart.filter((_, j) => j !== i));

  const SEG = [['proj', 'Nouveau projet'], ['rev', 'Révision'], ['task', 'Tâche']];

  return (
    <React.Fragment>
      <PageHead title="Nouveau ticket" sub="Crée un projet, une révision ou une tâche. Le code est attribué automatiquement (compteur par client, jamais réutilisé)." />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'start' }}>
        {/* form */}
        <Card>
          {/* AI prefill — multi-passes (extraction → contrôle → passe ciblée) */}
          <div style={{ border: '1px solid var(--border)', background: 'var(--orange-50)', borderRadius: 12, padding: '13px 14px', marginBottom: 18 }}>
            <div className="r26-label" style={{ color: 'var(--orange-600)', fontSize: 10.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="sparkles" size={14} color="var(--orange-600)" /> Pré-remplir depuis une source — IA (optionnel)</div>
            <textarea value={aiSrc} onChange={(e) => setAiSrc(e.target.value)} placeholder="Colle le message, le retour client, le texte d'un PPTX… L'IA en déduit la fiche en 3 passes (extraction, contrôle, passe ciblée) — tu valides avant de créer." style={{ ...inputStyle, minHeight: 60, resize: 'vertical', background: 'var(--surface, #fff)' }}></textarea>
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Button variant="primary" icon="wand-2" onClick={runAI} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 13, opacity: aiPhase ? 0.6 : 1 }}>{aiPhase ? 'Lecture…' : 'Lire & remplir'}</Button>
              {aiPhase && <span style={{ fontSize: 12.5, color: 'var(--orange-700)', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="loader" size={13} color="var(--orange-600)" /> {aiPhase}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}><Icon name="settings" size={12} /> clé & modèle</span>
            </div>
            {aiResult && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="r26-label" style={{ fontSize: 10, color: 'var(--fg3)', marginRight: 2 }}>Confiance</span>
                  {aiResult.confidence.map(([f, c]) => {
                    const col = c >= 0.8 ? '#1F8A5B' : c >= 0.6 ? 'var(--orange-700)' : '#B4472E';
                    return <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--radius-pill)', border: `1px solid ${col}`, color: col }}>{f} {Math.round(c * 100)}%</span>;
                  })}
                </div>
                {aiResult.issues.map((it) => (
                  <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12.5, color: 'var(--fg2)' }}>
                    <Icon name="alert-circle" size={13} color="#C99A5B" /> {it}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 5, background: 'var(--paper-100)', borderRadius: 'var(--radius-pill)', padding: 5, marginBottom: 20 }}>
            {SEG.map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill)', padding: '10px 12px', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)', background: mode === k ? 'var(--ink-950)' : 'transparent', color: mode === k ? '#fff' : 'var(--fg2)' }}>{l}</button>
            ))}
          </div>

          <div className="r26-label" style={{ color: 'var(--orange-600)', fontSize: 10.5, marginBottom: 12 }}>Rattachement</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {mode === 'proj' ? (
              <React.Fragment>
                {tField('Client', true, <select value={client} onChange={(e) => setClient(e.target.value)} style={inputStyle}><option value="">— choisir —</option>{clients.map((c) => <option key={c} value={c}>{c}</option>)}</select>)}
                {tField('Préfixe code', false, <input value={client ? CLIENT_PREFIX[client] : ''} disabled placeholder="auto" style={{ ...inputStyle, color: 'var(--fg3)' }} />)}
              </React.Fragment>
            ) : (
              <div style={{ gridColumn: '1 / -1' }}>
                {tField('Projet parent', true, <select value={parent} onChange={(e) => setParent(e.target.value)} style={inputStyle}><option value="">— choisir —</option>{masters.filter((m) => m.entree === 'Maître' || !m.parent).map((m) => <option key={m.ndeg} value={m.ndeg}>{m.ndeg} · {m.title}</option>)}</select>)}
              </div>
            )}
          </div>

          {mode === 'proj' && client && window.StakeStrip && <div style={{ marginBottom: 20 }}><StakeStrip client={client} compact /></div>}

          <div className="r26-label" style={{ color: 'var(--orange-600)', fontSize: 10.5, marginBottom: 12 }}>Contenu</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>{tField('Intitulé', true, <input value={projet} onChange={(e) => setProjet(e.target.value)} placeholder="ex. Poster annonce changement packaging" style={inputStyle} />)}</div>
            <div style={{ gridColumn: '1 / -1' }}>{tField('Catégorie → assigne le responsable', true, <select value={cat} onChange={(e) => { setCat(e.target.value); const c = TICKET_CATS.find((x) => x.cat === e.target.value); if (c) setResp(c.resp); }} style={inputStyle}>{TICKET_CATS.map((c) => <option key={c.cat} value={c.cat}>{c.cat}</option>)}</select>)}</div>
            {tField('Type', false, <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>{TICKET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>)}
            {tField('Niveau', false, <select value={niveau} onChange={(e) => setNiveau(e.target.value)} style={inputStyle}>{['Production', 'Concept', 'Récurrent'].map((n) => <option key={n} value={n}>{n}</option>)}</select>)}
            {tField('Priorité', false, <select value={prio} onChange={(e) => setPrio(e.target.value)} style={inputStyle}>{['P0', 'P1', 'P2', 'P3'].map((p) => <option key={p} value={p}>{p}</option>)}</select>)}
            {tField('Statut', false, <select value={statut} onChange={(e) => setStatut(e.target.value)} style={inputStyle}>{['Reçu', 'En cours', 'En attente client', 'Bloqué', 'Livré'].map((s) => <option key={s} value={s}>{s}</option>)}</select>)}
            {tField('Marque / filiale', false, <input value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Bonnet Rouge…" style={inputStyle} />)}
            {tField('Échéance', false, <input type="date" style={inputStyle} />)}
            {tField('Cluster', false, <input value={cluster} onChange={(e) => setCluster(e.target.value)} placeholder="ESA / Western…" style={inputStyle} />)}
            {tField('Pays', false, <input value={pays} onChange={(e) => setPays(e.target.value)} placeholder="Cameroun…" style={inputStyle} />)}
            {tField('Responsable', false, <select value={resp} onChange={(e) => setResp(e.target.value)} style={inputStyle}>{TEAM_BASE.map((n) => <option key={n} value={n}>{n}</option>)}</select>)}
            {tField('Entré par', false, <select value={entrePar} onChange={(e) => setEntrePar(e.target.value)} style={inputStyle}>{['Coordination', 'Direction', ...TEAM_BASE, 'Client (direct)'].map((n) => <option key={n} value={n}>{n}</option>)}</select>)}
            <div style={{ gridColumn: '1 / -1' }}>{tField('Livrables attendus', false, <input placeholder="Poster 60×40, TG, wobbler…" style={inputStyle} />)}</div>
            <div style={{ gridColumn: '1 / -1' }}>{tField('Source (lien Slack / mail)', false, <input placeholder="https://… ou threadId" style={inputStyle} />)}</div>
            <div style={{ gridColumn: '1 / -1' }}>{tField('Commentaire', false, <textarea placeholder="Contexte, point bloquant…" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}></textarea>)}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <Button variant="primary" icon="plus" onClick={add} style={{ flexDirection: 'row-reverse', opacity: ok ? 1 : 0.5 }}>Ajouter au panier</Button>
            <Button variant="ghost" onClick={() => setProjet('')}>Réinitialiser</Button>
          </div>
        </Card>

        {/* preview + cart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Card tone="dark">
            <div className="r26-label" style={{ color: 'var(--orange-300, #FFAA6E)', fontSize: 10.5, marginBottom: 12 }}>Aperçu du ticket</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, color: 'var(--orange-300, #FFAA6E)' }}>{code}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(247,242,234,0.6)', marginTop: 4 }}>
              {ok ? (mode === 'proj' ? (client || 'client ?') : `révision de ${parent}`) : `Manque : ${missing.join(' · ')}`}
            </div>
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.6, color: '#F7F2EA', wordBreak: 'break-word' }}>
              {ok ? `${code},${mode === 'proj' ? client : ''},${projet},${type},${statut},${prio},${resp},${entrePar}` : '—'}
            </div>
          </Card>

          <Card>
            <div className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5, marginBottom: 14 }}>Panier {cart.length ? `· ${cart.length}` : ''}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', borderRadius: 12, background: 'var(--orange-50)', border: '1px solid var(--border)', marginBottom: 12 }}>
              <Icon name="gauge" size={15} color="var(--orange-600)" />
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--fg2)' }}>
                Avant de valider le brief clientèle, <a href="#" onClick={(e) => { e.preventDefault(); if (window.appNavigate) window.appNavigate('Étalons'); }} style={{ color: 'var(--orange-700)', fontWeight: 700 }}>challenger le délai promis</a> — le système le confronte aux durées étalon et montre ce qui saute dans le portefeuille.
              </span>
            </div>
            {cart.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cart.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, background: 'var(--paper-100)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--orange-700)', background: 'var(--orange-50)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>{t.code}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.projet}</span>
                    <button onClick={() => removeItem(i)} style={{ border: 'none', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontStyle: 'italic', color: 'var(--fg3)', fontSize: 13, textAlign: 'center', padding: '14px 0' }}>Panier vide. Ajoute un ticket.</div>}
            <div style={{ display: 'flex', gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
              <Button variant="dark" icon="check" style={{ flexDirection: 'row-reverse', padding: '10px 15px', fontSize: 13, opacity: cart.length ? 1 : 0.5 }}>{`Créer (${cart.length})`}</Button>
              <Button variant="ghost" icon="download" style={{ flexDirection: 'row-reverse', padding: '10px 15px', fontSize: 13 }}>CSV</Button>
              {cart.length > 0 && <Button variant="ghost" onClick={() => setCart([])} style={{ padding: '10px 15px', fontSize: 13 }}>Vider</Button>}
            </div>
          </Card>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { TicketPage });
