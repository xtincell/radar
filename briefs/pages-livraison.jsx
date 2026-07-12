// Dashboard R26 × Radar — Livraison : le circuit asset → validation → révision.
// 3 volets :
//  1. Dépôt créatif   — le créatif importe l'asset sur sa tâche : naming auto,
//                       rangement simulé, statut « Livré — en validation » (stop-clock).
//  2. Validation client — assets livrés par volet ; Valider, ou Commenter via un
//                       formulaire FERMÉ qui génère un ticket .Rn formaté + note datée.
//  3. Présentation    — compilateur fermé : chaque slide est un slot alimenté par un
//                       champ système (jamais saisi dans le deck) ; slide vide = gate.

const LIV_VOLETS = ['Brief client', 'Brief créatif', 'Brief de production', 'Case study'];
const LIV_SEV = ['Mineure', 'Majeure', 'Bloquante'];

// Nature du livrable → formats attendus à chaque niveau.
// Épreuve = ce que le client voit pour valider (léger, non exploitable).
// Master = ce qui boucle la tâche (exploitable, archivable) — déverrouillé par la validation.
const LIV_CLASSES = {
  video: { icon: 'clapperboard', ep: 'Proxy MP4 1080p', ma: 'Master ProRes/4K + exports plateformes', epExt: '_1080p.mp4', maExt: '_master.mov' },
  print: { icon: 'printer', ep: 'PDF basse déf', ma: 'PDF HQ traits de coupe + sources', epExt: '_BD.pdf', maExt: '_HQ.pdf' },
  digital: { icon: 'monitor', ep: 'PNG @1x', ma: 'Assets @2x + fichiers sources', epExt: '_@1x.png', maExt: '_sources.zip' },
  image: { icon: 'image', ep: 'JPG/PNG basse déf', ma: 'PSD calques + PDF HD', epExt: '_BD.jpg', maExt: '.psd' },
};
function livClassOf(liv) {
  const l = (liv || '').toLowerCase();
  if (/film|spot|teaser|motion|vidéo|video|story|animée|sous-titrage/.test(l)) return 'video';
  if (/plv|print|affiche|ooh|presse|édition|rapport|leaflet|panneaux|pack|stop-rayon|habillage|carte/.test(l)) return 'print';
  if (/landing|maquette|site|display|template|email|banner|cms/.test(l)) return 'digital';
  return 'image';
}
const livSlug = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const livNow = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const livName = (p, liv, v) => `${p.ndeg}_${(p.marque || '').replace(/\s+/g, '')}_${livSlug(liv)}_v${v}.psd`;
const livEpName = (p, liv, v) => livName(p, liv, v).replace(/\.psd$/, '') + LIV_CLASSES[livClassOf(liv)].epExt;
const livPath = (p, liv) => `/Marques/${(p.marque || '').replace(/\s+/g, '')}/${p.ndeg}/${livSlug(liv)}/`;

function LivStatusChip({ st }) {
  const map = {
    attendu: { label: 'Attendu', variant: 'outline' },
    livre: { label: 'Épreuve en validation', variant: 'soft' },
    valide: { label: 'Validé — master attendu', variant: 'soft' },
    revision: { label: 'En révision', variant: 'solid' },
    master: { label: 'Complété ✓ master livré', variant: 'ink' },
  };
  const m = map[st] || map.attendu;
  return <Chip variant={m.variant} style={{ fontSize: 10.5, padding: '3px 10px' }}>{m.label}</Chip>;
}

// ---- Volet 1 : Dépôt créatif — file personnelle, glisser-déposer, épreuve puis master ----
function LivLane({ label, formats, fname, done, at, locked, action, onAction }) {
  return (
    <div style={{ flex: 1, minWidth: 230, borderRadius: 12, padding: '10px 13px', background: done ? 'var(--paper-100)' : 'transparent', border: done ? 'none' : `1.5px dashed ${locked ? 'var(--border)' : 'var(--border-strong)'}`, opacity: locked ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)' }}>{label}</span>
        <span style={{ flex: 1 }}></span>
        {done ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#1F8A5B' }}><Icon name="check-circle-2" size={13} color="#1F8A5B" />{at}</span>
        ) : locked ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--fg3)' }}><Icon name="lock" size={12} color="var(--fg3)" />après validation</span>
        ) : (
          <button onClick={onAction} style={{ border: 'none', cursor: 'pointer', background: 'var(--ink-950)', color: '#fff', padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600 }}>{action}</button>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 5 }}>{formats}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fname}</div>
    </div>
  );
}

function LivDepotView({ delivAll, setDelivAll, onOpenProject }) {
  const [who, setWho] = useState('Laure Pemha');
  const tasks = ALL_BRIEFS.filter((b) => isActiveP(b) && b.responsable === who);
  const allLivs = (b) => (b.livrables || '').split('·').map((s) => s.trim()).filter(Boolean);
  const stOf = (b, liv) => ((delivAll[b.ndeg] || {})[liv] || { st: 'attendu', v: 1 });
  const set = (b, liv, d) => setDelivAll({ ...delivAll, [b.ndeg]: { ...(delivAll[b.ndeg] || {}), [liv]: d } });
  const counts = tasks.reduce((a, b) => {
    allLivs(b).forEach((liv) => { const s = stOf(b, liv).st; a.total++; if (s === 'livre') a.enVal++; if (s === 'master') a.done++; if (s === 'valide') a.masters++; });
    return a;
  }, { total: 0, enVal: 0, done: 0, masters: 0 });

  return (
    <React.Fragment>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Créatif :</span>
        {TEAM_BASE.map((n) => (
          <button key={n} onClick={() => setWho(n)} style={{ border: who === n ? 'none' : '1.5px solid var(--border-strong)', background: who === n ? 'var(--ink-950)' : 'transparent', color: who === n ? '#fff' : 'var(--fg2)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Avatar initials={initialsFromName(n)} size={20} tint="var(--orange-200)" style={{ border: 'none' }} />{firstNameOf(n)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[[counts.total, 'Livrables attendus'], [counts.enVal, 'Épreuves en validation'], [counts.masters, 'Masters à livrer'], [counts.done, 'Complétés']].map(([v, l]) => (
          <Card key={l} pad={16}>
            <div className="r26-stat" style={{ fontSize: 28, lineHeight: 1.1 }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 3 }}>{l}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--orange-50)', border: '1px solid var(--border)', marginBottom: 16, fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg2)' }}>
        <Icon name="mouse-pointer-click" size={15} color="var(--orange-700)" />
        <span>Glisser-déposer le fichier sur la vignette — le système nomme, range et change le statut. <strong>Épreuve</strong> (légère) pour la validation client, <strong>master</strong> (exploitable) pour boucler : le master ne se déverrouille qu'après validation. Le chrono interne se suspend au dépôt de l'épreuve.</span>
      </div>

      {tasks.map((b) => {
        const livs = allLivs(b);
        const late = isLateP(b);
        return (
          <Card key={b.ndeg} pad={0} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(b.client), flexShrink: 0 }}></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)' }}>{b.ndeg}</span>
              <span style={{ flex: 1, minWidth: 160, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: late ? '#B4472E' : 'var(--fg3)' }}>{late ? `⚠ échéance ${fmtDateP(b.deadline)}` : `échéance ${fmtDateP(b.deadline)}`}{b.deadlineHard ? ' ⚑' : ''}</span>
              <button onClick={() => onOpenProject(b.ndeg)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--orange-700)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>suivre la validation</button>
            </div>
            {livs.map((liv, i) => {
              const d = stOf(b, liv);
              const cls = LIV_CLASSES[livClassOf(liv)];
              const base = livName(b, liv, d.v).replace(/\.psd$/, '');
              return (
                <div key={liv} style={{ display: 'flex', gap: 14, padding: '13px 24px', borderBottom: i === livs.length - 1 ? 'none' : '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 96, height: 64, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: 'var(--paper-100)' }}>
                    <image-slot id={`liv-${b.ndeg}-${livSlug(liv)}`} shape="rounded" placeholder="Déposer ici" style={{ width: '100%', height: '100%' }}></image-slot>
                  </div>
                  <div style={{ width: 190, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name={cls.icon} size={14} color="var(--fg3)" />
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{liv}</span>
                    </div>
                    <div style={{ marginTop: 5 }}><LivStatusChip st={d.st} /></div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg3)', marginTop: 5 }}>{livPath(b, liv)}</div>
                  </div>
                  <LivLane label={`Épreuve${d.v > 1 ? ` · v${d.v}` : ''}`} formats={cls.ep} fname={base + cls.epExt}
                    done={d.st !== 'attendu' && d.st !== 'revision'} at={d.at}
                    action={d.st === 'revision' ? `Déposer v${d.v + 1}` : "Déposer l'épreuve"}
                    onAction={() => set(b, liv, { st: 'livre', v: d.st === 'revision' ? d.v + 1 : d.v, at: livNow() })} />
                  <LivLane label="Master" formats={cls.ma} fname={base + cls.maExt}
                    done={d.st === 'master'} at={d.maAt} locked={d.st !== 'valide' && d.st !== 'master'}
                    action="Livrer le master"
                    onAction={() => set(b, liv, { ...d, st: 'master', maAt: livNow() })} />
                </div>
              );
            })}
          </Card>
        );
      })}
      {!tasks.length && <Card style={{ textAlign: 'center', padding: 36, fontSize: 13.5, color: 'var(--fg3)' }}>Aucune tâche active pour {firstNameOf(who)}.</Card>}
    </React.Fragment>
  );
}

// ---- Volet 2 : Validation client ----
function LivRevisionForm({ p, liv, nextR, onCancel, onCreate }) {
  const [volet, setVolet] = useState('Brief créatif');
  const [sev, setSev] = useState('Majeure');
  const [newDl, setNewDl] = useState(false);
  const [comment, setComment] = useState('');
  const ok = comment.trim().length > 0;
  const selStyle = (on) => ({ border: on ? 'none' : '1.5px solid var(--border-strong)', background: on ? 'var(--ink-950)' : 'transparent', color: on ? '#fff' : 'var(--fg2)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600 });
  return (
    <div style={{ marginTop: 12, padding: 16, borderRadius: 14, background: 'var(--paper-100)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Commentaire → ticket <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{p.ndeg}.R{nextR}</span> <span style={{ fontWeight: 500, color: 'var(--fg3)' }}>— formulaire fermé : un commentaire non mappé n'engage pas l'agence.</span></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--fg3)', fontWeight: 600, width: 110 }}>Volet impacté</span>
        {LIV_VOLETS.map((v) => <button key={v} onClick={() => setVolet(v)} style={selStyle(volet === v)}>{v}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--fg3)', fontWeight: 600, width: 110 }}>Sévérité</span>
        {LIV_SEV.map((s) => <button key={s} onClick={() => setSev(s)} style={selStyle(sev === s)}>{s}</button>)}
        <span style={{ width: 14 }}></span>
        <button onClick={() => setNewDl(!newDl)} style={selStyle(newDl)}>{newDl ? '⚑ Nouvelle échéance exigée' : 'Échéance inchangée'}</button>
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire client (verbatim)…" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, resize: 'vertical', background: 'var(--paper-0)' }}></textarea>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel} style={{ padding: '8px 14px', fontSize: 12.5 }}>Annuler</Button>
        <Button variant="dark" icon="ticket" onClick={() => ok && onCreate({ volet, sev, newDl, comment: comment.trim() })} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 12.5, opacity: ok ? 1 : 0.5 }}>Générer le ticket</Button>
      </div>
    </div>
  );
}

function LivValidationView({ p, deliv, setDeliv, revs, setRevs }) {
  const [formFor, setFormFor] = useState(null);
  const livrables = (p.livrables || '').split('·').map((s) => s.trim()).filter(Boolean);
  const delivered = livrables.filter((l) => deliv[l] && deliv[l].st !== 'attendu');
  const tension = tensionP(p);
  const nextR = revs.length + 1;

  const createRev = (liv, f) => {
    const ticket = {
      ndeg: `${p.ndeg}.R${nextR}`, asset: liv, file: livEpName(p, liv, (deliv[liv] || { v: 1 }).v),
      volet: f.volet, sev: f.sev, newDl: f.newDl, comment: f.comment, date: livNow(),
    };
    setRevs([...revs, ticket]);
    setDeliv({ ...deliv, [liv]: { ...deliv[liv], st: 'revision' } });
    setFormFor(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start' }}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '13px 24px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Espace client — {p.client}</span>
          <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>Vue externe : le client voit les assets livrés, valide ou commente. Il ne voit jamais les notes internes.</div>
        </div>
        {delivered.length ? delivered.map((liv, i) => {
          const d = deliv[liv];
          return (
            <div key={liv} style={{ padding: '15px 24px', borderBottom: i === delivered.length - 1 ? 'none' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{liv}</span>
                    <LivStatusChip st={d.st} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', marginTop: 4 }}>{livEpName(p, liv, d.v)} · livré le {d.at}</div>
                </div>
                {d.st === 'livre' && (
                  <span style={{ display: 'inline-flex', gap: 8 }}>
                    <Button variant="dark" icon="check" onClick={() => setDeliv({ ...deliv, [liv]: { ...d, st: 'valide' } })} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 12.5 }}>Valider</Button>
                    <Button variant="ghost" icon="message-square" onClick={() => setFormFor(formFor === liv ? null : liv)} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 12.5 }}>Commenter</Button>
                  </span>
                )}
              </div>
              {formFor === liv && <LivRevisionForm p={p} liv={liv} nextR={nextR} onCancel={() => setFormFor(null)} onCreate={(f) => createRev(liv, f)} />}
            </div>
          );
        }) : <div style={{ padding: '28px 24px', fontSize: 13.5, color: 'var(--fg3)', textAlign: 'center' }}>Rien à valider — aucun asset déposé pour l'instant (volet Dépôt créatif).</div>}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {revs.length > 0 && tension !== 'fair' && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 15px', borderRadius: 12, background: 'var(--orange-50)', border: '1.5px solid var(--orange-500)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg2)', alignItems: 'flex-start' }}>
            <Icon name="alert-triangle" size={16} color="var(--orange-700)" />
            <span><strong>R{revs.length} sur un délai déjà {tension === 'unfair' ? 'injuste' : 'serré'}.</strong> Chaque round consomme la marge — <a href="#" onClick={(e) => { e.preventDefault(); if (window.appNavigate) window.appNavigate('Étalons'); }} style={{ color: 'var(--orange-700)', fontWeight: 700 }}>re-challenger le délai</a> avant d'accepter la révision.</span>
          </div>
        )}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Tickets de révision</span>
            <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{revs.length} générés</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12, lineHeight: 1.5 }}>Générés par le système au moment du commentaire — note datée, volet scopé, jamais rédigés à la main.</div>
          {revs.length ? revs.map((r) => (
            <div key={r.ndeg} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--paper-100)', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{r.ndeg}</span>
                <Chip variant={r.sev === 'Bloquante' ? 'solid' : r.sev === 'Majeure' ? 'ink' : 'outline'} style={{ fontSize: 10, padding: '2px 9px' }}>{r.sev}</Chip>
                {r.newDl && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B4472E' }}>⚑ échéance exigée</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 6, lineHeight: 1.5 }}>
                <strong>{r.asset}</strong> · volet {r.volet} · {r.date}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.5 }}>« {r.comment} »</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)', marginTop: 6 }}>{r.file} → v{parseInt(r.ndeg.split('.R')[1], 10) + 1} attendue</div>
            </div>
          )) : <div style={{ fontSize: 13, color: 'var(--fg3)', textAlign: 'center', padding: '14px 0' }}>Aucune révision — le silence du client n'en génère pas.</div>}
        </Card>
      </div>
    </div>
  );
}

// ---- Volet 3 : Présentation compilée (format fermé) ----
function LivPresentationView({ p, deliv }) {
  const g = (window.GABARIT_DATA || {})[p.ndeg] || {};
  const c = g.client || {}, cr = g.crea || {}, pr = g.prod || {}, su = g.suivi || {};
  const delivered = (p.livrables || '').split('·').map((s) => s.trim()).filter((l) => deliv[l] && deliv[l].st !== 'attendu' && deliv[l].st !== 'revision');
  const SLOTS = [
    { n: '01', title: 'Ouverture', src: 'Ticket', field: 'title', val: p.title && `${p.title} — ${p.client}` },
    { n: '02', title: 'Problème', src: 'Brief client', field: 'probleme_marketing', val: c.probleme_marketing },
    { n: '03', title: 'Insight', src: 'Brief client', field: 'insight_client', val: c.insight_client },
    { n: '04', title: 'Big idea', src: 'Brief client', field: 'big_idea', val: c.big_idea, hero: true },
    { n: '05', title: 'Axe 1', src: 'Proposition', field: 'axe1_nom', val: c.axe1_nom && `${c.axe1_nom} — ${c.axe1_intention || ''}` },
    { n: '06', title: 'Axe 2', src: 'Proposition', field: 'axe2_nom', val: c.axe2_nom && `${c.axe2_nom} — ${c.axe2_intention || ''}` },
    { n: '07', title: 'Concept recommandé', src: 'Brief créatif', field: 'concept1_nom', val: cr.concept1_nom && `${cr.concept1_nom} · ${cr.concept1_reco || ''} — ${cr.concept1_piste || ''}` },
    { n: '08', title: 'Direction artistique', src: 'Brief créatif', field: 'da_palette', val: cr.da_palette && `${cr.da_style_image || ''} · palette ${cr.da_palette}` },
    { n: '09', title: 'Copy', src: 'Brief créatif', field: 'copy_claim', val: cr.copy_claim && `« ${cr.copy_claim} » — ${cr.copy_accroche || ''}` },
    { n: '10', title: 'Assets présentés', src: 'Livraison', field: 'assets', val: delivered.length ? delivered.join(' · ') : '' },
    { n: '11', title: 'Plan de production', src: 'Brief de production', field: 'livrable_principal', val: pr.livrable_principal && `${pr.livrable_principal} · ${pr.ratio || ''} · ${(pr.plateformes || []).join(', ')}` },
    { n: '12', title: 'Délais', src: 'Étalons', field: 'delai_realiste', val: su.delai_realiste && `Réaliste : ${su.delai_realiste} (${su.duree_etalon || ''} ${su.marge || ''})` },
  ];
  const missing = SLOTS.filter((s) => !s.val);
  const ready = missing.length === 0;
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, marginBottom: 20, flexWrap: 'wrap', background: ready ? 'var(--ink-950)' : 'var(--orange-50)', border: ready ? 'none' : '1.5px solid var(--orange-500)' }}>
        <Icon name={ready ? 'presentation' : 'lock'} size={18} color={ready ? 'var(--orange-500)' : 'var(--orange-700)'} />
        <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, lineHeight: 1.5, color: ready ? '#F7F2EA' : 'var(--fg1)' }}>
          {ready
            ? <span><strong>Prête à présenter.</strong> 12 slides compilées depuis le système — rien n'a été saisi dans le deck.</span>
            : <span><strong>Présentation verrouillée</strong> — {missing.length} slide{missing.length > 1 ? 's' : ''} sans champ source. On ne présente pas un brief non qualifié : l'impro est structurellement impossible.</span>}
        </span>
        {ready
          ? <Button variant="primary" icon="play" style={{ flexDirection: 'row-reverse', padding: '9px 18px', fontSize: 13 }}>Compiler le deck</Button>
          : <Button variant="dark" icon="pencil" onClick={() => { window.__gabaritOpen = p.ndeg; if (window.appNavigate) window.appNavigate('Gabarits'); }} style={{ flexDirection: 'row-reverse', padding: '9px 18px', fontSize: 13 }}>Compléter dans Gabarits</Button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {SLOTS.map((s) => (
          <div key={s.n} style={{
            borderRadius: 14, padding: 16, minHeight: 128, display: 'flex', flexDirection: 'column',
            background: !s.val ? 'transparent' : s.hero ? 'var(--ink-950)' : 'var(--surface)',
            border: s.val ? 'none' : '1.5px dashed var(--border-strong)',
            boxShadow: s.val ? 'var(--shadow-md)' : 'none',
            color: s.hero && s.val ? '#F7F2EA' : 'var(--fg1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: s.hero && s.val ? 'rgba(247,242,234,0.6)' : 'var(--fg3)' }}>{s.n}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: s.val ? 'var(--orange-50)' : 'transparent', border: s.val ? 'none' : '1px solid var(--border-strong)', color: s.val ? 'var(--orange-700)' : 'var(--fg3)' }}>{s.src}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
            {s.val ? (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: s.hero ? 'rgba(247,242,234,0.8)' : 'var(--fg2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.val}</div>
            ) : (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--fg3)' }}>Champ manquant : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{s.field}</span></div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg3)', lineHeight: 1.55, marginTop: 16 }}>Chaque slide est un slot alimenté par un champ système (brief client → proposition → brief créatif → brief de production). On modifie la source, jamais la slide — changer un axe après coup = ticket d'amendement.</div>
    </React.Fragment>
  );
}

function LivraisonPage() {
  const withBrief = ALL_BRIEFS.filter((b) => (window.GABARIT_DATA || {})[b.ndeg] && isActiveP(b));
  const pool = withBrief.length ? withBrief : ALL_BRIEFS.filter(isActiveP);
  const [ndeg, setNdeg] = useState((pool[0] || {}).ndeg);
  const p = ALL_BRIEFS.find((b) => b.ndeg === ndeg) || pool[0] || {};
  const chips = pool.some((b) => b.ndeg === ndeg) ? pool : [...pool, p];
  const [delivAll, setDelivAll] = useState({});
  const [revsAll, setRevsAll] = useState({});
  const deliv = delivAll[ndeg] || {};
  const revs = revsAll[ndeg] || [];
  const setDeliv = (d) => setDelivAll({ ...delivAll, [ndeg]: d });
  const setRevs = (r) => setRevsAll({ ...revsAll, [ndeg]: r });
  const [view, setView] = useState('depot');
  const SUBS = {
    depot: "File de livraison du créatif — glisser-déposer, épreuve pour valider, master pour boucler",
    validation: 'Le client valide ou commente — chaque commentaire mappé devient un ticket .Rn',
    presentation: 'Deck compilé depuis les champs système — slide vide = présentation verrouillée',
  };
  return (
    <React.Fragment>
      <PageHead title="Livraison" sub={SUBS[view]} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['depot', 'Dépôt créatif'], ['validation', 'Validation client'], ['presentation', 'Présentation']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            border: view === k ? 'none' : '1.5px solid var(--border-strong)',
            background: view === k ? 'var(--ink-950)' : 'transparent', color: view === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        {view !== 'depot' && <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Projet :</span>}
        {view !== 'depot' && chips.map((b) => (
          <button key={b.ndeg} onClick={() => setNdeg(b.ndeg)} style={{ border: ndeg === b.ndeg ? 'none' : '1.5px solid var(--border-strong)', background: ndeg === b.ndeg ? 'var(--ink-950)' : 'transparent', color: ndeg === b.ndeg ? '#fff' : 'var(--fg2)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: clientColOf(b.client) }}></span>{b.ndeg}
          </button>
        ))}
      </div>
      {view === 'depot' ? <LivDepotView delivAll={delivAll} setDelivAll={setDelivAll} onOpenProject={(n) => { setNdeg(n); setView('validation'); }} />
        : view === 'validation' ? <LivValidationView p={p} deliv={deliv} setDeliv={setDeliv} revs={revs} setRevs={setRevs} />
        : <LivPresentationView p={p} deliv={deliv} />}
    </React.Fragment>
  );
}

Object.assign(window, { LivraisonPage });
