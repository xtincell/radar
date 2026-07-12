// Dashboard R26 — Tâche detail view (ouverte depuis la liste des tâches)

const SOUS_TACHES = [
  { title: 'Récupérer les assets de la marque', done: true },
  { title: 'Décliner la piste retenue', done: true },
  { title: 'Préparer les exports (web + print)', done: false },
  { title: 'Envoyer pour validation interne', done: false },
];

function SousTacheRow({ s, last }) {
  const [done, setDone] = useState(s.done);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <button onClick={() => setDone(!done)} style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: done ? 'none' : '1.5px solid var(--border-strong)',
        background: done ? 'var(--orange-500)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}>
        {done && <Icon name="check" size={11} color="var(--fg-on-orange)" strokeWidth={3} />}
      </button>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, opacity: done ? 0.45 : 1, textDecoration: done ? 'line-through' : 'none' }}>{s.title}</span>
    </div>
  );
}

function TacheInfo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
    </div>
  );
}

function TacheDetail({ t, group, onBack }) {
  const [briefP, setBriefP] = useState(null);
  const proj = findProjectForTask(t.sub);
  return (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <IconBtn name="arrow-left" variant="light" size={42} onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em' }}>{t.title}</h1>
            <Chip variant={t.chip} style={{ fontSize: 12, padding: '5px 13px' }}>{t.prio}</Chip>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 14.5, color: 'var(--fg3)' }}>{t.sub} · {group}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {proj && <Button variant="ghost" icon="book-open" onClick={() => setBriefP(proj)} style={{ flexDirection: 'row-reverse' }}>Voir le brief</Button>}
          <Button variant="dark" icon="check" style={{ flexDirection: 'row-reverse' }}>Marquer terminée</Button>
        </div>
      </div>
      {briefP && <BriefModal p={briefP} onClose={() => setBriefP(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20, maxWidth: 1100 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              <TacheInfo label="Projet">{t.sub}</TacheInfo>
              <TacheInfo label="Assigné à"><Avatar initials={t.who} size={24} tint="var(--orange-200)" /> {t.who}</TacheInfo>
              <TacheInfo label="Échéance"><Icon name="clock" size={14} color="var(--fg3)" /> {group}</TacheInfo>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 10 }}>Description</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg2)' }}>
              {t.title.split('–')[0].trim()} dans le cadre du projet {t.sub}. Suivre la direction
              artistique validée et livrer les fichiers sources avec les exports.
            </p>
          </Card>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Sous-tâches</span>
              <Button variant="ghost" icon="plus" style={{ padding: '7px 14px', fontSize: 13 }}>Ajouter</Button>
            </div>
            {SOUS_TACHES.map((s, i) => <SousTacheRow key={s.title} s={s} last={i === SOUS_TACHES.length - 1} />)}
          </Card>
        </div>

        <Card style={{ alignSelf: 'start' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Activité</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { who: t.who, text: 'a coché deux sous-tâches', when: 'Il y a 2 h' },
              { who: 'NM', text: `a passé la priorité en « ${t.prio} »`, when: 'Hier' },
              { who: 'NM', text: `a assigné la tâche à ${t.who}`, when: 'Il y a 3 jours' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar initials={a.who} size={30} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5 }}><strong>{a.who}</strong> {a.text}</span>
                  <div style={{ fontSize: 11.5, color: 'var(--fg3)', marginTop: 2 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { TacheDetail });
