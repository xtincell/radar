// Dashboard R26 — Projet detail view (opened from the Projets grid)

const DETAIL_TASKS = [
  { title: 'Moodboard & piste créative', done: true, who: 'LP' },
  { title: 'KV principal — Visuel 1', done: true, who: 'KA' },
  { title: 'KV principal — Visuel 2', done: false, who: 'KA' },
  { title: 'Déclinaisons formats social', done: false, who: 'SD' },
  { title: 'Adaptation print / OOH', done: false, who: 'MB' },
];

const DETAIL_ACTIVITY = [
  { who: 'KA', text: 'a livré le Visuel 1 pour validation', when: 'Il y a 2 h' },
  { who: 'NM', text: 'a validé le moodboard', when: 'Hier' },
  { who: 'LP', text: 'a ajouté le brief mis à jour', when: 'Il y a 3 jours' },
  { who: 'SD', text: 'a rejoint le projet', when: 'Il y a 5 jours' },
];

const DETAIL_FILES = ['brief v2.pdf', 'moodboard.pdf', 'kv visuel 1.psd'];

function DetailKpi({ label, value, icon }) {
  return (
    <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color="var(--orange-600)" />
      </span>
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, marginTop: 1 }}>{value}</div>
      </div>
    </Card>
  );
}

function DetailTaskRow({ t, last }) {
  const [done, setDone] = useState(t.done);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <button onClick={() => setDone(!done)} style={{
        width: 21, height: 21, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        border: done ? 'none' : '1.5px solid var(--border-strong)',
        background: done ? 'var(--orange-500)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}>
        {done && <Icon name="check" size={12} color="var(--fg-on-orange)" strokeWidth={3} />}
      </button>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, opacity: done ? 0.45 : 1, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</span>
      <Avatar initials={t.who} size={26} tint="var(--orange-200)" />
    </div>
  );
}

function ProjetDetail({ p, onBack }) {
  return (
    <React.Fragment>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <IconBtn name="arrow-left" variant="light" size={42} onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', background: 'var(--paper-100)', padding: '3px 9px', borderRadius: 6 }}>{p.ndeg}</span>
            <Chip variant={p.chip} style={{ fontSize: 12, padding: '5px 13px' }}>{p.status}</Chip>
            <Chip variant={p.prio === 'P0' ? 'solid' : p.prio === 'P1' ? 'soft' : 'outline'} style={{ fontSize: 11.5, padding: '4px 11px' }}>{p.prio}</Chip>
            {isLateP(p) && <Chip variant="outline" style={{ fontSize: 11.5, padding: '4px 11px', color: '#B4472E', borderColor: '#B4472E' }}>En retard {daysLateP(p)}j</Chip>}
          </div>
          <h1 style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, letterSpacing: '-0.01em' }}>{p.title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14.5, color: 'var(--fg3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: clientColOf(p.client) }}></span>{p.client}</span> · {p.marque} · {p.type}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {p.team.map((t, i) => <Avatar key={t} initials={t} size={34} tint={i % 2 ? 'var(--paper-200)' : 'var(--orange-200)'} style={{ marginLeft: i ? -9 : 0 }} />)}
          </div>
          <Button variant="dark" icon="pencil" style={{ flexDirection: 'row-reverse' }}>Modifier</Button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 20 }}>
        <DetailKpi label="Avancement" value={`${p.pct}%`} icon="trending-up" />
        <DetailKpi label="Échéance" value={isLateP(p) ? `+${daysLateP(p)}j` : fmtDateP(p.deadline)} icon="calendar" />
        <DetailKpi label="Tâches" value="2/5" icon="check-square" />
        <DetailKpi label="Livrables" value={DETAIL_FILES.length} icon="package" />
      </div>

      {/* Radar meta (additif) — fiche complète base */}
      <Card pad={20} style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          {[
            ['Statut', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUT_COL[p.statutRadar] }}></span>{p.statutRadar}</span>],
            ['Priorité', p.prio],
            ['Responsable', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Avatar initials={initialsOf(p.responsable)} size={22} tint="var(--orange-200)" />{p.responsable.split(' ')[0]}</span>],
            ['Entré par', p.entrePar],
            ['Cluster', p.cluster || '—'],
            ['Pays', p.pays || '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '10px 22px', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>Livrables</span>
            {p.livrables.split('·').map((l) => <Chip key={l} variant="outline" style={{ fontSize: 12, padding: '5px 12px' }}>{l.trim()}</Chip>)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="r26-label" style={{ color: 'var(--fg3)', fontSize: 10.5 }}>Documents</span>
            {[['Brief', p.docBrief], ['Propal', p.docPropal], ['Livraison', p.docLivr]].map(([l, doc]) => doc ? (
              <Chip key={l} variant="soft" style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="file-text" size={12} /> {l}</Chip>
            ) : (
              <Chip key={l} variant="outline" style={{ fontSize: 12, padding: '5px 12px', opacity: 0.45 }}>{`${l} —`}</Chip>
            ))}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {p.privateTo && <Chip variant="ink" style={{ fontSize: 11.5, padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="lock" size={11} /> Privé · {firstNameOf(p.privateTo)}</Chip>}
            {p.threadId && <span style={{ fontSize: 12, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}><Icon name="link" size={12} /> {p.threadId}</span>}
          </span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
        {/* Left: brief + tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 10 }}>Brief</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg2)' }}>
              Concevoir le dispositif {p.type.toLowerCase()} pour {p.title.split('–')[0].trim()}.
              Ton chaleureux et premium, cohérent avec la plateforme de marque. Livrables : KV principal,
              déclinaisons social et print, adaptation des formats médias.
            </p>
          </Card>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Tâches du projet</span>
              <Button variant="ghost" icon="plus" style={{ padding: '7px 14px', fontSize: 13 }}>Ajouter</Button>
            </div>
            {DETAIL_TASKS.map((t, i) => <DetailTaskRow key={t.title} t={t} last={i === DETAIL_TASKS.length - 1} />)}
          </Card>
        </div>

        {/* Right: visuels + files + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Visuels de livrables</span>
              <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>glisser une image</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <image-slot id={`${p.ndeg}-v1`} shape="rounded" radius="12" placeholder="Visuel 1" style={{ width: '100%', height: 130 }}></image-slot>
              <image-slot id={`${p.ndeg}-v2`} shape="rounded" radius="12" placeholder="Visuel 2" style={{ width: '100%', height: 130 }}></image-slot>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Fichiers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DETAIL_FILES.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderRadius: 12, background: 'var(--paper-100)', border: '1px solid var(--border)' }}>
                  <Icon name="file" size={16} color="var(--fg3)" />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{f}</span>
                  <Icon name="download" size={15} color="var(--fg3)" />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Activité récente</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DETAIL_ACTIVITY.map((a, i) => (
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
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { ProjetDetail });
