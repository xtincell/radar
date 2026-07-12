// Dashboard R26 × Radar — Étalons & délais, v2.
// Trois vues :
//  1. Référentiel  — tâches type : standard industrie vs constatée agence vs devis freelance,
//                    + plancher compressé et son sacrifice.
//  2. Devis délai  — le directeur clientèle compose un projet (tâches enchaînées / parallèles)
//                    et obtient les 3 durées à présenter : incompressible / réaliste / compressée.
//  3. Urgences     — flags interne/externe + conflits par responsable (vue conservée).
// Logique des durées : industrie ≤ compressée ≤ constatée. La compression rapproche la durée
// constatée du plancher industrie EN SACRIFIANT (rounds, déclinaisons, ou staffing pris sur
// d'autres clients). Le freelance est plus court car production seule (hors coordination,
// direction créative, allers-retours) — c'est l'argument comparatif, pas un équivalent.

const ET_TODAY = new Date(new Date().toDateString());
const etIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function etAddDays(iso, n) { if (!/^\d{4}/.test(iso || '')) return ''; const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return etIso(d); }
function etAddWork(iso, n) { if (!/^\d{4}/.test(iso || '')) return ''; const d = new Date(iso + 'T00:00:00'); let a = 0; while (a < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) a++; } return etIso(d); }

// ---- Référentiel des tâches type (jours ouvrés) ----
// industrie = plancher métier (incompressible) · floor = compressé (sous sacrifice)
// agenceDefault = constatée par défaut, remplacée par la moyenne mesurée quand l'échantillon existe
// scope du sacrifice : 'projet' (qualité/périmètre de CE client) | 'staffing' (pris sur d'autres clients)
const TASK_REF = [
  { id: 'kv', cat: 'Image & DA', label: 'Key Visual maître', type: 'Social / Print', industrie: 8, floor: 9, agenceDefault: 12, freelance: 5, sacrifice: 'Un seul round de retours, moodboard sauté', scope: 'projet' },
  { id: 'decl', cat: 'Image & DA', label: 'Déclinaisons social (série de 5)', type: 'Social', industrie: 3, floor: 3, agenceDefault: 5, freelance: 2, sacrifice: 'Adaptation mécanique, pas de re-création par format', scope: 'projet' },
  { id: 'ooh', cat: 'Image & DA', label: 'Affiche / OOH', type: 'Print', industrie: 5, floor: 6, agenceDefault: 8, freelance: 3, sacrifice: 'Retouche allégée, une seule piste présentée', scope: 'projet' },
  { id: 'mood', cat: 'Image & DA', label: 'Moodboard / cadrage DA', type: '', industrie: 3, floor: 3, agenceDefault: 4, freelance: 2, sacrifice: 'Références existantes uniquement, pas d\'exploration', scope: 'projet' },
  { id: 'film30', cat: 'Film & motion', label: 'Film 30s (tournage)', type: 'Film', industrie: 15, floor: 17, agenceDefault: 21, freelance: 10, sacrifice: 'Renfort monteur pris sur un autre projet, étalonnage réduit', scope: 'staffing' },
  { id: 'teaser', cat: 'Film & motion', label: 'Teaser 15s (motion)', type: 'Teaser / Digital', industrie: 6, floor: 7, agenceDefault: 10, freelance: 4, sacrifice: 'Bibliothèque d\'assets au lieu d\'animations sur mesure', scope: 'projet' },
  { id: 'motion', cat: 'Film & motion', label: 'Motion social (15s, déclinable)', type: 'Social / Film', industrie: 4, floor: 5, agenceDefault: 7, freelance: 3, sacrifice: 'Motion designer détaché d\'un autre compte', scope: 'staffing' },
  { id: 'logo', cat: 'Identité', label: 'Logo + charte essentielle', type: 'Branding', industrie: 15, floor: 18, agenceDefault: 24, freelance: 10, sacrifice: '2 pistes au lieu de 3, tests d\'usage réduits', scope: 'projet' },
  { id: 'pack', cat: 'Print & packaging', label: 'Packaging (design + déclinaisons SKU)', type: 'Packaging', industrie: 10, floor: 12, agenceDefault: 15, freelance: 7, sacrifice: 'Déclinaisons SKU en chaîne après validation du master seul', scope: 'projet' },
  { id: 'plv', cat: 'Print & packaging', label: 'PLV / stop-rayon / leaflet', type: 'Print / PLV', industrie: 6, floor: 7, agenceDefault: 10, freelance: 4, sacrifice: 'Gabarits existants imposés, pas de format sur mesure', scope: 'projet' },
  { id: 'edition', cat: 'Print & packaging', label: 'Édition (rapport, brochure 24–48p)', type: 'Édition', industrie: 12, floor: 14, agenceDefault: 18, freelance: 8, sacrifice: 'Maquette-type par cahier, relecture unique', scope: 'projet' },
  { id: 'landing', cat: 'Digital', label: 'Landing page (maquette + assets)', type: 'Digital', industrie: 7, floor: 8, agenceDefault: 10, freelance: 5, sacrifice: 'Desktop d\'abord, responsive livré après mise en ligne', scope: 'projet' },
  { id: 'email', cat: 'Digital', label: 'Template email', type: '', industrie: 2, floor: 2, agenceDefault: 3, freelance: 1, sacrifice: 'Structure standard, pas de modules custom', scope: 'projet' },
  { id: 'plateforme', cat: 'Stratégie', label: 'Plateforme de marque', type: '', industrie: 10, floor: 12, agenceDefault: 14, freelance: 7, sacrifice: 'Ateliers condensés en une session, benchmark réduit', scope: 'projet' },
  { id: 'concept', cat: 'Stratégie', label: 'Concept de campagne (2 axes)', type: '', industrie: 6, floor: 7, agenceDefault: 9, freelance: 4, sacrifice: 'Un seul axe développé, le second en piste esquissée', scope: 'projet' },
];

// constatée réelle par type — uniquement les briefs de niveau 'Tâche' (granularité comparable)
function etObserved() {
  const obs = {};
  (window.ALL_BRIEFS || []).forEach((b) => {
    if (b.niveau !== 'Tâche') return; // un brief campagne/projet entier ne mesure pas une tâche type
    if (!b.closedAt || !b.date_recu) return;
    const lead = Math.round((new Date(b.closedAt) - new Date(b.date_recu)) / 864e5);
    if (lead <= 1 || lead > 180) return;
    (obs[b.type] = obs[b.type] || []).push(lead);
  });
  return obs;
}

// constatée retenue pour une tâche type : échantillon n≥3 ET médiane ≤ 2× l'étalon industrie
// (médiane, pas moyenne : robuste aux outliers), sinon estimation calibrée.
function etAgenceOf(t, obs) {
  const samples = (obs && obs[t.type]) || [];
  if (samples.length >= 3) {
    const sorted = [...samples].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    if (med <= t.industrie * 2) return { val: med, real: true, n: samples.length };
  }
  return { val: t.agenceDefault, real: false, n: samples.length };
}

const ET_PRESETS = {
  'Campagne de lancement': { kv: 'seq', concept: 'seq', decl: 'par', teaser: 'par', ooh: 'par' },
  'Refresh identité': { plateforme: 'seq', logo: 'seq', edition: 'par' },
  'Activation retail': { kv: 'seq', pack: 'seq', plv: 'par', decl: 'par' },
};

// total du chemin : les enchaînées s'additionnent, les parallèles courent pendant la chaîne
function etPathTotal(sel, dur) {
  let seq = 0, par = 0;
  TASK_REF.forEach((t) => {
    const m = sel[t.id];
    if (m === 'seq') seq += dur(t);
    else if (m === 'par') par = Math.max(par, dur(t));
  });
  return Math.max(seq, par);
}

function EtSegBtns({ value, onChange, opts }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, background: 'var(--paper-100)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
      {opts.map(([k, l, col]) => (
        <button key={k} onClick={() => onChange(k)} style={{ border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill)', padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', background: value === k ? (col || 'var(--ink-950)') : 'transparent', color: value === k ? '#fff' : 'var(--fg2)' }}>{l}</button>
      ))}
    </span>
  );
}

// ---- Vue 1 : Référentiel ----
function EtReferentielView() {
  const obs = etObserved();
  const cats = [...new Set(TASK_REF.map((t) => t.cat))];
  return (
    <React.Fragment>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['shield', 'Standard industrie', 'Le plancher du métier — aucun prestataire sérieux ne fait mieux à périmètre égal. C\'est l\'argument « vous ne verrez pas mieux ailleurs ».'],
          ['activity', 'Constatée agence', 'La moyenne mesurée sur nos projets bouclés — défendable par l\'historique. Quand l\'échantillon manque, une estimation calibrée la remplace.'],
          ['user', 'Devis freelance', 'Plus court sur le papier : production seule, hors coordination, direction créative et allers-retours de validation. À opposer, pas à imiter.'],
        ].map(([ic, t, d]) => (
          <Card key={t} pad={18} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={ic} size={17} color="var(--orange-600)" /></span>
            <span><span style={{ fontSize: 13.5, fontWeight: 700, display: 'block' }}>{t}</span><span style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.5, display: 'block', marginTop: 3 }}>{d}</span></span>
          </Card>
        ))}
      </div>

      {cats.map((cat) => (
        <Card key={cat} pad={0} style={{ overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '13px 24px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{cat}</span>
            <span style={{ width: 92, textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industrie</span>
            <span style={{ width: 108, textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Constatée</span>
            <span style={{ width: 92, textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Freelance*</span>
            <span style={{ width: 110, textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compressée</span>
          </div>
          {TASK_REF.filter((t) => t.cat === cat).map((t, i, arr) => {
            const ag = etAgenceOf(t, obs);
            const agence = ag.val;
            const drift = agence - t.industrie;
            return (
              <div key={t.id} style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)', padding: '12px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0 }}>{t.label}</span>
                  <span style={{ width: 92, textAlign: 'right', fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{t.industrie} j</span>
                  <span style={{ width: 108, textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 700, color: ag.real && drift >= 4 ? '#B4472E' : 'var(--fg1)' }}>{agence} j</span>
                    <span style={{ fontSize: 10.5, color: 'var(--fg3)' }}> {ag.real ? `(n=${ag.n})` : '(est.)'}</span>
                  </span>
                  <span style={{ width: 92, textAlign: 'right', fontSize: 13.5, color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums' }}>{t.freelance} j</span>
                  <span style={{ width: 110, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: 'var(--orange-700)', fontVariantNumeric: 'tabular-nums' }}>{t.floor} j</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--fg3)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Compression : {t.sacrifice.toLowerCase()}</span>
                  {ag.real && drift >= 4 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--orange-50)', color: 'var(--orange-700)', flexShrink: 0 }}>recalibrage suggéré : étalon → {Math.round((t.industrie + agence) / 2)} j</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', flexShrink: 0, ...(t.scope === 'staffing' ? { background: '#B4472E', color: '#fff' } : { border: '1px solid var(--border-strong)', color: 'var(--fg3)' }) }}>{t.scope === 'staffing' ? 'coût : autres clients' : 'coût : ce projet'}</span>
                </div>
              </div>
            );
          })}
        </Card>
      ))}
      <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.55 }}>
        * Devis freelance = production seule (hors coordination, direction créative, allers-retours de validation) — comparaison commerciale, pas un délai équivalent.
        La durée compressée ne descend jamais sous le standard industrie : en dessous, ce n'est plus la même prestation.
        La constatée n'écrase l'estimation que sur échantillon suffisant (n≥3, briefs de niveau tâche, moyenne ≤ 2× l'étalon) — sinon « est. ».
      </div>
    </React.Fragment>
  );
}

// ---- Vue 2 : Devis délai (composeur du directeur clientèle) ----
function EtDevisView() {
  const [sel, setSel] = useState(ET_PRESETS['Campagne de lancement']);
  const [promis, setPromis] = useState(18); // délai que le directeur clientèle compte promettre (j)
  const [devClient, setDevClient] = useState('');
  const obs = etObserved();
  const agenceOf = (t) => etAgenceOf(t, obs).val;
  const nSel = Object.keys(sel).filter((k) => sel[k]).length;
  const inc = etPathTotal(sel, (t) => t.industrie);
  const realBase = etPathTotal(sel, agenceOf);
  const comp = etPathTotal(sel, (t) => t.floor);
  const free = etPathTotal(sel, (t) => t.freelance);
  const MARGE = Math.min(5, Math.max(2, Math.round(realBase * 0.15))); // proportionnelle (15%, bornée 2–5 j) — pas une marge uniforme
  const sacrifices = TASK_REF.filter((t) => sel[t.id] && t.floor < agenceOf(t));

  // ---- Challenge du délai promis ----
  const verdict = nSel === 0 ? null
    : promis >= realBase + MARGE ? { k: 'ok', label: 'Confortable — engagez', col: '#1F8A5B', txt: 'Le délai promis couvre notre durée constatée + marge. Engagement sans sacrifice.' }
    : promis >= comp ? { k: 'cond', label: 'Tenable sous conditions', col: 'var(--orange-700)', txt: 'Sous notre réaliste : les sacrifices ci-dessous doivent être actés AVANT de valider le brief — et facturés ou compensés.' }
    : promis >= inc ? { k: 'nego', label: 'À renégocier', col: '#B4472E', txt: 'Même compressé avec tous les sacrifices, on ne tient pas ce délai. Renégocier le délai ou réduire le périmètre.' }
    : { k: 'refus', label: 'Refuser — sous le standard industrie', col: '#B4472E', txt: 'Personne ne livre ça à périmètre égal. Promettre ce délai, c’est promettre un retard.' };

  // Impact portefeuille : qui saute si on s'engage (matrice urgence × importance)
  const etDaysTo = (p) => Math.round((new Date(p.deadline) - ET_TODAY) / 864e5);
  const activeP = (window.PROJECTS || []).filter(isActiveP);
  const impact = activeP.map((p) => {
    const urgent = isLateP(p) || etDaysTo(p) <= 5;
    const important = p.prio === 'P0' || p.prio === 'P1';
    return { p, urgent, important };
  });
  const aPostpone = impact.filter((x) => x.urgent && !x.important);      // urgent non important → reporter/annuler d'abord
  const reportables = impact.filter((x) => !x.urgent && !x.important);   // ni urgent ni important → reportable si besoin
  const staffTouch = [...new Set(sacrifices.filter((t) => t.scope === 'staffing').map((t) => t.label))];
  const intouchables = impact.filter((x) => x.urgent && x.important);    // à protéger si on ponctionne du staffing
  const cats = [...new Set(TASK_REF.map((t) => t.cat))];
  const cycle = (id) => setSel((s) => { const cur = s[id]; const next = cur === 'seq' ? 'par' : cur === 'par' ? undefined : 'seq'; return { ...s, [id]: next }; });

  const ResultCard = ({ tone, days, title, sub, badge }) => {
    const tones = {
      floor: { bg: 'var(--paper-100)', col: 'var(--fg1)', bd: '1px solid var(--border)' },
      reco: { bg: 'var(--ink-950)', col: '#F7F2EA', bd: 'none' },
      comp: { bg: 'var(--orange-50)', col: 'var(--orange-700)', bd: '1px solid var(--border)' },
    }[tone];
    return (
      <div style={{ background: tones.bg, border: tones.bd, borderRadius: 16, padding: '16px 18px', position: 'relative' }}>
        {badge && <span style={{ position: 'absolute', top: -9, right: 14, fontSize: 10, fontWeight: 700, background: 'var(--orange-500)', color: 'var(--fg-on-orange)', padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>{badge}</span>}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: tone === 'reco' ? 'rgba(247,242,234,0.75)' : 'var(--fg3)' }}>{title}</div>
        <div className="r26-stat" style={{ fontSize: 34, lineHeight: 1.1, color: tones.col, margin: '4px 0 2px' }}>{days}</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.45, color: tone === 'reco' ? 'rgba(247,242,234,0.6)' : 'var(--fg3)' }}>{sub}</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* composeur */}
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Modèles :</span>
          {Object.keys(ET_PRESETS).map((p) => (
            <button key={p} onClick={() => setSel(ET_PRESETS[p])} style={{ border: '1.5px solid var(--border-strong)', background: 'transparent', color: 'var(--fg2)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600 }}>{p}</button>
          ))}
          <button onClick={() => setSel({})} style={{ border: 'none', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Vider</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Client :</span>
          {Object.keys(window.STAKEHOLDERS || {}).map((c) => (
            <button key={c} onClick={() => setDevClient(devClient === c ? '' : c)} style={{ border: devClient === c ? 'none' : '1.5px solid var(--border-strong)', background: devClient === c ? 'var(--ink-950)' : 'transparent', color: devClient === c ? '#fff' : 'var(--fg2)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: clientColOf(c) }}></span>{c}
            </button>
          ))}
        </div>
        {cats.map((cat) => (
          <Card key={cat} pad={0} style={{ overflow: 'hidden', marginBottom: 14 }}>
            <div className="r26-label" style={{ color: 'var(--fg3)', padding: '11px 20px 9px', fontSize: 10.5, borderBottom: '1px solid var(--border)' }}>{cat}</div>
            {TASK_REF.filter((t) => t.cat === cat).map((t, i, arr) => {
              const m = sel[t.id];
              return (
                <div key={t.id} onClick={() => cycle(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)', background: m ? 'var(--orange-50)' : 'transparent', transition: 'background var(--dur-fast) var(--ease-out)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, border: m ? 'none' : '1.5px solid var(--border-strong)', background: m ? 'var(--orange-500)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m && <Icon name="check" size={12} color="var(--fg-on-orange)" strokeWidth={3} />}
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{agenceOf(t)} j</span>
                  {m && (
                    <span onClick={(e) => { e.stopPropagation(); setSel((s) => ({ ...s, [t.id]: m === 'seq' ? 'par' : 'seq' })); }} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-pill)', flexShrink: 0, cursor: 'pointer', background: m === 'seq' ? 'var(--ink-950)' : 'transparent', border: m === 'seq' ? 'none' : '1.5px solid var(--border-strong)', color: m === 'seq' ? '#fff' : 'var(--fg2)' }}>{m === 'seq' ? '⛓ enchaînée' : '⇉ parallèle'}</span>
                  )}
                </div>
              );
            })}
          </Card>
        ))}
        <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.55 }}>Clic = sélectionner · re-clic sur le badge = enchaînée ⇄ parallèle. Les enchaînées s'additionnent (chemin critique) ; les parallèles courent pendant la chaîne.</div>
      </div>

      {/* résultats */}
      <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {devClient && window.StakeStrip && <StakeStrip client={devClient} compact />}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Délais à présenter</span>
            <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{nSel} tâche{nSel > 1 ? 's' : ''}</span>
          </div>
          {nSel === 0 ? <div style={{ fontSize: 13.5, color: 'var(--fg3)', textAlign: 'center', padding: '18px 0' }}>Sélectionne des tâches pour composer le devis.</div> : (
            <React.Fragment>
              {/* Challenge : délai promis vs les 3 durées */}
              <div style={{ border: `1.5px solid ${verdict.col}`, borderRadius: 14, padding: '13px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>Délai promis au client</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {[-5, -1].map((d) => <button key={d} onClick={() => setPromis(Math.max(1, promis + d))} style={{ width: 25, height: 25, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper-50)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--fg2)' }}>{d}</button>)}
                    <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: 44, textAlign: 'center' }}>{promis} j</span>
                    {[1, 5].map((d) => <button key={d} onClick={() => setPromis(promis + d)} style={{ width: 25, height: 25, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper-50)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--fg2)' }}>+{d}</button>)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: verdict.col, flexShrink: 0 }}></span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: verdict.col }}>{verdict.label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginTop: 4 }}>{verdict.txt}</div>
              </div>
              <ResultCard tone="reco" days={`${realBase} j + ${MARGE} ouvrés`} title="Réaliste — recommandé" sub="Basé sur nos durées constatées + marge agence. Défendable par l'historique : c'est ce que l'agence tient vraiment." badge="à vendre" />
              <ResultCard tone="comp" days={`${comp} j`} title="Compressée — sous conditions" sub="Atteignable uniquement avec les sacrifices listés ci-dessous. À n'accorder que contre une contrepartie." />
              <ResultCard tone="floor" days={`${inc} j`} title="Incompressible — standard industrie" sub="Le plancher du métier à périmètre égal. En dessous, personne ne livre — le client ne verra pas mieux ailleurs." />
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 12, background: 'var(--paper-100)', fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5 }}>
                <Icon name="user" size={14} color="var(--fg3)" />
                <span>Un freelance annoncerait ~<strong>{free} j</strong> — production seule, sans coordination ni direction créative. C'est l'écart à expliquer, pas à combler.</span>
              </div>
            </React.Fragment>
          )}
        </Card>

        {nSel > 0 && verdict && verdict.k !== 'ok' && (
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Ce qui saute si on s'engage</div>
            <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12, lineHeight: 1.5 }}>Impact sur le portefeuille actif — matrice urgence × importance. On reporte d'abord l'urgent non important.</div>
            {aPostpone.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="r26-label" style={{ color: '#B4472E', fontSize: 10, marginBottom: 7 }}>À reporter / annuler d'abord · urgent mais non important</div>
                {aPostpone.map((x) => (
                  <div key={x.p.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontSize: 12.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: clientColOf(x.p.client), flexShrink: 0 }}></span>
                    <span style={{ flex: 1, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.p.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid #B4472E', color: '#B4472E', flexShrink: 0 }}>{isLateP(x.p) ? 'reporter · déjà en retard' : 'reporter'}</span>
                  </div>
                ))}
              </div>
            )}
            {reportables.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10, marginBottom: 7 }}>Reportables si besoin · ni urgents ni importants</div>
                {reportables.map((x) => (
                  <div key={x.p.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontSize: 12.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: clientColOf(x.p.client), flexShrink: 0 }}></span>
                    <span style={{ flex: 1, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.p.title}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>{x.p.prio} · {fmtDateP(x.p.deadline)}</span>
                  </div>
                ))}
              </div>
            )}
            {staffTouch.length > 0 && intouchables.length > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--orange-50)', fontSize: 12, lineHeight: 1.5, color: 'var(--fg2)' }}>
                <strong style={{ color: 'var(--orange-700)' }}>⚠ Ponction de staffing</strong> ({staffTouch.join(', ')}) : protéger les urgents importants — {intouchables.map((x) => x.p.title).join(' · ')}.
              </div>
            )}
          </Card>
        )}

        {nSel > 0 && sacrifices.length > 0 && (
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Prix de la compression</div>
            <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12 }}>Ce que la durée compressée coûte, tâche par tâche.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sacrifices.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-700)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginTop: 1 }}>−{agenceOf(t) - t.floor} j</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, display: 'block' }}>{t.label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--fg3)', display: 'block', marginTop: 1, lineHeight: 1.45 }}>{t.sacrifice}</span>
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', flexShrink: 0, ...(t.scope === 'staffing' ? { background: '#B4472E', color: '#fff' } : { border: '1px solid var(--border-strong)', color: 'var(--fg3)' }) }}>{t.scope === 'staffing' ? 'autres clients' : 'ce projet'}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---- Vue 3 : Urgences (conservée) ----
function EtUrgencesView() {
  const [marge, setMarge] = useState('normal');
  const margeDays = marge === 'normal' ? 5 : 2;
  const etalonOf = (t) => ETALON_BY_TYPE[t] ?? 10;

  const active = (window.ALL_BRIEFS || []).filter(isActiveP);
  const flagged = active.map((b) => {
    const dlNormal = etAddWork(etAddDays(b.date_recu, etalonOf(b.type)), margeDays);
    return { b, dlNormal, interne: !!dlNormal && b.deadline < dlNormal, externe: isLateP(b) };
  }).filter((x) => x.interne || x.externe)
    .sort((a, b) => (b.interne && b.externe ? 1 : 0) - (a.interne && a.externe ? 1 : 0));

  const byResp = {};
  flagged.forEach((x) => { const r = x.b.responsable || 'Non assigné'; (byResp[r] = byResp[r] || []).push(x); });
  const conflicts = Object.entries(byResp).filter(([, arr]) => arr.length >= 2).sort((a, b) => b[1].length - a[1].length);

  return (
    <React.Fragment>
      <Card style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Marge agence</div>
          <div style={{ fontSize: 13, color: 'var(--fg3)', marginTop: 3 }}>Délai normal = étalon + marge en jours ouvrés. Le mode urgent compresse la marge, jamais l'étalon.</div>
        </div>
        <EtSegBtns value={marge} onChange={setMarge} opts={[['normal', 'Normal · +5 j ouvrés'], ['urgent', 'Urgent · +2 j ouvrés', '#B4472E']]} />
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>Urgences flaguées</span>
            <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{flagged.length} sur {active.length} actifs</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 10, lineHeight: 1.5 }}>
            <strong style={{ color: '#8A6428' }}>Interne</strong> = échéance sous le délai normal agence · <strong style={{ color: '#B4472E' }}>Externe</strong> = délai convenu client dépassé.
          </div>
          {flagged.length ? flagged.map((x, i) => (
            <div key={x.b.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(x.b.client), flexShrink: 0 }}></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.b.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg3)', marginTop: 2 }}>
                  exigé {fmtDateP(x.b.deadline)}{x.b.deadlineHard ? ' ⚑' : ''} · normal {x.dlNormal ? fmtDateP(x.dlNormal) : '—'} · {firstNameOf(x.b.responsable) || '—'}
                </div>
              </div>
              <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                {x.interne && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-pill)', border: '1px solid #C99A5B', color: '#8A6428' }}>Urgence interne</span>}
                {x.externe && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-pill)', background: '#B4472E', color: '#fff' }}>Urgence externe</span>}
              </span>
            </div>
          )) : <div style={{ fontSize: 13.5, color: 'var(--fg3)', padding: '16px 0', textAlign: 'center' }}>Aucune urgence au régime actuel. ✓</div>}
        </Card>
        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, marginBottom: 6 }}>Priorités en conflit</div>
          <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12, lineHeight: 1.5 }}>Responsables cumulant plusieurs urgences — à arbitrer.</div>
          {conflicts.length ? conflicts.map(([r, arr]) => (
            <div key={r} style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: 'var(--paper-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar initials={initialsFromName(r)} size={28} tint="var(--orange-200)" />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{r}</span>
                <Chip variant="solid" style={{ fontSize: 10.5, padding: '3px 10px' }}>{`${arr.length} urgences`}</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {arr.map((x) => (
                  <div key={x.b.ndeg} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', flexShrink: 0 }}>{x.b.ndeg}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.b.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: x.externe ? '#B4472E' : '#8A6428', flexShrink: 0 }}>{x.externe && x.interne ? 'ext + int' : x.externe ? 'externe' : 'interne'}</span>
                  </div>
                ))}
              </div>
            </div>
          )) : <div style={{ fontSize: 13.5, color: 'var(--fg3)', padding: '16px 0', textAlign: 'center' }}>Aucun conflit — une urgence max par personne.</div>}
        </Card>
      </div>
    </React.Fragment>
  );
}

function EtalonsPage() {
  const [view, setView] = useState('devis');
  const SUBS = {
    referentiel: 'Répertoire des tâches type — standard industrie, constatée agence, devis freelance, plancher compressé',
    devis: 'Composer un projet et obtenir les trois durées à présenter au client',
    urgences: 'Échéances sous le délai normal agence et conflits de priorités',
  };
  return (
    <React.Fragment>
      <PageHead title="Étalons & délais" sub={SUBS[view]} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['devis', 'Devis délai'], ['referentiel', 'Référentiel'], ['urgences', 'Urgences']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            border: view === k ? 'none' : '1.5px solid var(--border-strong)',
            background: view === k ? 'var(--ink-950)' : 'transparent', color: view === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {view === 'referentiel' ? <EtReferentielView /> : view === 'devis' ? <EtDevisView /> : <EtUrgencesView />}
    </React.Fragment>
  );
}

Object.assign(window, { EtalonsPage });
