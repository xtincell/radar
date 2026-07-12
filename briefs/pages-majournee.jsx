// Dashboard R26 × Radar — Ma journée : la vue individuelle de l'exécutant
// (todo.html) + le tableau public du jour (jour.html, affiché sans connexion).
// C'est l'écran d'atterrissage des rôles « member » après login.

function MjRow({ b, showWho, done, onToggle }) {
  const late = !done && isLateP(b);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 7 }}>
      <button onClick={onToggle} title={done ? 'Rouvrir (décocher)' : 'Marquer fait'} style={{
        width: 23, height: 23, borderRadius: 7, cursor: 'pointer', flexShrink: 0,
        border: done ? '1.8px solid #1F8A5B' : '1.8px solid var(--border-strong)',
        background: done ? '#1F8A5B' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{done && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</button>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: clientColOf(b.client), flexShrink: 0 }}></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'var(--fg3)', opacity: done ? 0.6 : 1 }}>{b.title}</div>
        <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>{[b.marque, b.client].filter(Boolean).join(' · ')} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{b.ndeg}</span></div>
      </div>
      {showWho && b.responsable && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg2)', flexShrink: 0 }}>{firstNameOf(b.responsable)}</span>}
      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-pill)', flexShrink: 0, ...(late ? { background: '#B4472E', color: '#fff' } : { border: '1px solid var(--border)', color: 'var(--fg3)' }) }}>
        {late ? `⚠ ${fmtDateP(b.deadline)}` : b.deadline ? fmtDateP(b.deadline) : b.statutRadar || '—'}
      </span>
    </div>
  );
}

function MjSection({ title, n, children, tone }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span className="r26-label" style={{ fontSize: 11, color: tone || 'var(--orange-700)' }}>{title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', background: tone === '#B4472E' ? '#B4472E' : 'var(--orange-500)', color: '#fff' }}>{n}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }}></span>
      </div>
      {children}
    </div>
  );
}

// ---- Volet 1 : Ma todo (vue member — verrouillée sur la personne) ----
function MjTodoView({ done, setDone }) {
  const [who, setWho] = useState('Laure Pemha');
  const today = new Date(new Date().toDateString());
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tIso = iso(today);
  const mine = ALL_BRIEFS.filter((b) => isActiveP(b) && b.responsable === who);
  const isDone = (b) => !!done[b.ndeg];
  const doneToday = mine.filter(isDone);
  const open = mine.filter((b) => !isDone(b));
  const lateOnes = open.filter(isLateP);
  const todayOnes = open.filter((b) => !isLateP(b) && b.deadline === tIso);
  const rest = open.filter((b) => !isLateP(b) && b.deadline !== tIso).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  const focus = lateOnes[0] || todayOnes[0] || rest[0];
  const toggle = (b) => setDone({ ...done, [b.ndeg]: !done[b.ndeg] });
  return (
    <React.Fragment>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Je suis :</span>
        {TEAM_BASE.map((n) => (
          <button key={n} onClick={() => setWho(n)} style={{ border: who === n ? 'none' : '1.5px solid var(--border-strong)', background: who === n ? 'var(--ink-950)' : 'transparent', color: who === n ? '#fff' : 'var(--fg2)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Avatar initials={initialsFromName(n)} size={20} tint="var(--orange-200)" style={{ border: 'none' }} />{firstNameOf(n)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>{open.length} ouvertes · {doneToday.length} faites</span>
      </div>

      {focus && (
        <div style={{ background: 'var(--ink-950)', borderRadius: 16, padding: '18px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="r26-label" style={{ color: 'var(--orange-500)', fontSize: 10.5, marginBottom: 6 }}>Focus — la prochaine chose à finir</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 21, color: '#F7F2EA' }}>{focus.title}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(247,242,234,0.6)', marginTop: 4 }}>{[focus.marque, focus.client].filter(Boolean).join(' · ')} · échéance {fmtDateP(focus.deadline)}{isLateP(focus) ? ' — déjà en retard' : ''}</div>
          </div>
          <Button variant="primary" icon="check" onClick={() => toggle(focus)} style={{ flexDirection: 'row-reverse', padding: '10px 18px', fontSize: 13.5 }}>Fait</Button>
        </div>
      )}

      {lateOnes.length > 0 && <MjSection title="En retard — à traiter d'abord" n={lateOnes.length} tone="#B4472E">{lateOnes.map((b) => <MjRow key={b.ndeg} b={b} done={false} onToggle={() => toggle(b)} />)}</MjSection>}
      <MjSection title="Aujourd'hui" n={todayOnes.length}>{todayOnes.length ? todayOnes.map((b) => <MjRow key={b.ndeg} b={b} done={false} onToggle={() => toggle(b)} />) : <div style={{ fontSize: 13, color: 'var(--fg3)', fontStyle: 'italic', padding: '6px 2px' }}>Rien de daté aujourd'hui.</div>}</MjSection>
      {rest.length > 0 && <MjSection title="À venir" n={rest.length}>{rest.map((b) => <MjRow key={b.ndeg} b={b} done={false} onToggle={() => toggle(b)} />)}</MjSection>}
      {doneToday.length > 0 && <MjSection title="Fait — recliquer pour rouvrir" n={doneToday.length} tone="#1F8A5B">{doneToday.map((b) => <MjRow key={b.ndeg} b={b} done onToggle={() => toggle(b)} />)}</MjSection>}
    </React.Fragment>
  );
}

// ---- Volet 2 : Tableau public du jour (jour.html — affiché sans connexion) ----
function MjPublicView() {
  const today = new Date(new Date().toDateString());
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const open = ALL_BRIEFS.filter(isActiveP);
  const todayOnes = open.filter((b) => b.deadline === iso);
  const lateOnes = open.filter(isLateP).sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  const byOwner = {};
  todayOnes.forEach((b) => { const o = b.responsable || '—'; (byOwner[o] = byOwner[o] || []).push(b); });
  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'var(--paper-100)', marginBottom: 20, fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg2)' }}>
        <Icon name="globe" size={15} color="var(--fg3)" />
        <span><strong>Tableau public</strong> — affiché sans connexion (écran du studio, TV du département). Colonnes limitées, jamais de notes internes ni de dossiers privés. Mis à jour en direct.</span>
      </div>
      <MjSection title="À faire aujourd'hui" n={todayOnes.length}>
        {Object.keys(byOwner).sort((a, b) => a.localeCompare(b, 'fr')).map((o) => (
          <div key={o} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 7px', fontSize: 13.5, fontWeight: 700 }}>
              <Avatar initials={initialsFromName(o)} size={24} tint="var(--orange-200)" />{o}
            </div>
            {byOwner[o].map((b) => <MjRow key={b.ndeg} b={b} done={false} onToggle={() => {}} />)}
          </div>
        ))}
        {!todayOnes.length && <div style={{ fontSize: 13.5, color: 'var(--fg3)', fontStyle: 'italic', padding: '10px 2px' }}>Rien de daté pour aujourd'hui. 🎉</div>}
      </MjSection>
      {lateOnes.length > 0 && <MjSection title="En retard (encore ouvert)" n={lateOnes.length} tone="#B4472E">{lateOnes.map((b) => <MjRow key={b.ndeg} b={b} showWho done={false} onToggle={() => {}} />)}</MjSection>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--fg3)', flexWrap: 'wrap', gap: 8 }}>
        <span>Tableau public — mis à jour en direct depuis le radar.</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
    </div>
  );
}

function MaJourneePage() {
  const [view, setView] = useState('todo');
  const [done, setDone] = useState({});
  return (
    <React.Fragment>
      <PageHead title="Ma journée" sub={view === 'todo' ? "Todo & Focus de l'exécutant — l'écran d'atterrissage des membres" : 'Todo du jour du département — tableau public, sans connexion'} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[['todo', 'Ma todo'], ['public', 'Tableau public']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            border: view === k ? 'none' : '1.5px solid var(--border-strong)',
            background: view === k ? 'var(--ink-950)' : 'transparent', color: view === k ? '#fff' : 'var(--fg2)',
            padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>
      {view === 'todo' ? <MjTodoView done={done} setDone={setDone} /> : <MjPublicView />}
    </React.Fragment>
  );
}

Object.assign(window, { MaJourneePage });
