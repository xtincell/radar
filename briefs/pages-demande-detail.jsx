// Dashboard R26 — Demande créative detail view (opened from the kanban)

const DEMANDE_COMMENTS = [
  { who: 'KA', text: 'Première piste envoyée, deux variantes de mise en page.', when: 'Il y a 1 h' },
  { who: 'RH', text: 'Merci ! Préférence pour la variante claire, avec le logo plus visible.', when: 'Il y a 3 h' },
  { who: 'NM', text: 'Demande assignée à Karim, livraison prévue avant le 18.', when: 'Hier' },
];

function DemandeInfo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
    </div>
  );
}

function DemandeDetail({ d, col, onBack }) {
  const [msg, setMsg] = useState('');
  const [comments, setComments] = useState(DEMANDE_COMMENTS);
  const send = () => {
    if (!msg.trim()) return;
    setComments([{ who: 'NM', text: msg.trim(), when: "À l'instant" }, ...comments]);
    setMsg('');
  };
  const statusChip = col === 'Nouveau' ? 'solid' : col === 'En cours' ? 'outline' : 'ink';
  return (
    <React.Fragment>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <IconBtn name="arrow-left" variant="light" size={42} onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em' }}>{d.title}</h1>
            <Chip variant={statusChip} style={{ fontSize: 12, padding: '5px 13px' }}>{col}</Chip>
            <Chip variant="outline" style={{ fontSize: 12, padding: '5px 13px' }}>{d.kind}</Chip>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 14.5, color: 'var(--fg3)' }}>Demandé par : {d.by}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {col !== 'Livré' && <Button variant="ghost" icon="user-plus" style={{ flexDirection: 'row-reverse' }}>Réassigner</Button>}
          {col === 'Nouveau' && <Button variant="primary" icon="play" style={{ flexDirection: 'row-reverse' }}>Prendre en charge</Button>}
          {col === 'En cours' && <Button variant="dark" icon="check" style={{ flexDirection: 'row-reverse' }}>Marquer livré</Button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
        {/* Left: infos + description + livrable attendu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
              <DemandeInfo label="Demandeur">{d.by}</DemandeInfo>
              <DemandeInfo label="Échéance"><Icon name="clock" size={14} color="var(--fg3)" /> {d.due}</DemandeInfo>
              <DemandeInfo label="Assigné à">
                {d.who ? <React.Fragment><Avatar initials={d.who} size={24} tint="var(--orange-200)" /> {d.who}</React.Fragment> : <span style={{ color: 'var(--fg3)', fontWeight: 500 }}>Non assigné</span>}
              </DemandeInfo>
              <DemandeInfo label="Format">{d.kind}</DemandeInfo>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 10 }}>Description</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg2)' }}>
              Créer « {d.title.split('–')[0].trim()} » pour l'équipe {d.by}. Respecter la charte
              graphique en vigueur, textes fournis par le demandeur. Livraison au format {d.kind.toLowerCase()} prêt à publier.
            </p>
          </Card>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Livrable attendu</div>
            <div style={{
              aspectRatio: '16 / 7', borderRadius: 14,
              background: 'repeating-linear-gradient(135deg, var(--paper-200) 0 8px, var(--paper-100) 8px 16px)',
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>aperçu du livrable — en attente</span>
            </div>
          </Card>
        </div>

        {/* Right: discussion */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Discussion</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Écrire un message…"
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
                padding: '11px 16px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
                background: 'var(--paper-100)', color: 'var(--fg1)',
              }}
            />
            <IconBtn name="send" variant="orange" size={42} onClick={send} active />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar initials={c.who} size={30} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 13.5 }}>{c.who}</strong>
                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{c.when}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--fg2)', marginTop: 3, lineHeight: 1.5 }}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </React.Fragment>
  );
}

// ---- À valider : retours clients → révisions proposées (concept ingest Radar) ----

const RETOURS = [
  { client: 'Bonnet Rouge', from: 'Direction Marketing', when: 'Il y a 2 h', prio: 'P1', type: 'Révision', projet: 'Bonnet Rouge – Ramadan 2025',
    text: 'Sur le film Ramadan, le logo apparaît trop tard et la musique couvre la voix-off. Peut-on remonter le logo à 3s et baisser la musique ?' },
  { client: 'Panza Foods', from: 'Chef de produit', when: 'Hier', prio: 'P0', type: 'Nouvelle tâche', projet: 'Campagne La Pasta – Rentrée 2026',
    text: 'Le visuel 2 de La Pasta est validé, mais il faut le décliner en story 9:16 pour Instagram avant vendredi.' },
  { client: 'AGL', from: 'Com interne', when: 'Hier', prio: 'P2', type: 'Nouveau brief', projet: 'Nouveau projet',
    text: 'Nouvelle demande : bannière LinkedIn pour annoncer la ligne maritime. Pas de deadline stricte.' },
  { client: 'Payboard', from: 'CEO', when: 'Il y a 2 j', prio: 'P1', type: 'Révision', projet: 'Payboard – Teaser Launch',
    text: 'Le teaser est parfait. On aimerait une version carrée pour le feed en plus du 16:9.' },
];

function RetourCard({ r, onResolve }) {
  const cCol = (typeof clientColOf === 'function') ? clientColOf(r.client) : 'var(--orange-500)';
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: cCol, flexShrink: 0 }}></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.client}</div>
          <div style={{ fontSize: 12, color: 'var(--fg3)' }}>via {r.from} · {r.when}</div>
        </div>
        <Chip variant={r.prio === 'P0' ? 'solid' : r.prio === 'P1' ? 'soft' : 'outline'} style={{ fontSize: 11, padding: '3px 10px' }}>{r.prio}</Chip>
      </div>
      <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-cream)', fontSize: 14, lineHeight: 1.55, color: 'var(--fg2)', fontStyle: 'italic' }}>
        « {r.text} »
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--fg3)' }}>
        <span className="r26-label" style={{ fontSize: 10.5, color: 'var(--fg3)' }}>Proposition</span>
        <Chip variant="ink" style={{ fontSize: 11, padding: '3px 10px' }}>{r.type}</Chip>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="folder" size={13} /> {r.projet}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" icon="x" onClick={() => onResolve('rejet')} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 13 }}>Rejeter</Button>
        <Button variant="primary" icon="check" onClick={() => onResolve('valide')} style={{ flexDirection: 'row-reverse', padding: '8px 14px', fontSize: 13 }}>Valider en tâche</Button>
      </div>
    </Card>
  );
}

function AValiderView() {
  const [items, setItems] = useState(RETOURS);
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: 14, borderRadius: 14, background: 'var(--orange-50)', border: '1px solid var(--border)' }}>
        <Icon name="sparkles" size={18} color="var(--orange-600)" />
        <span style={{ fontSize: 13.5, color: 'var(--fg2)' }}>Retours clients structurés automatiquement en tâches — à confirmer avant insertion dans le pipe.</span>
      </div>
      {items.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, alignItems: 'start' }}>
          {items.map((r, i) => (
            <RetourCard key={i} r={r} onResolve={() => setItems(items.filter((_, j) => j !== i))} />
          ))}
        </div>
      ) : (
        <Card tone="cream" style={{ padding: 40, textAlign: 'center', color: 'var(--fg3)' }}>Tous les retours ont été traités. ✓</Card>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { DemandeDetail, AValiderView, RETOURS });
