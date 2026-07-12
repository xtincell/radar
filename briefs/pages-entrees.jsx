// Dashboard R26 × Radar — Entrées (journal du pipe), Gelés, Historique

const CANAL_COL = {
  Slack: '#7A2E86', Notion: 'var(--ink-700, #4a4038)', Tracker: 'var(--orange-600)',
  Ticket: '#1F8A5B', WhatsApp: '#1a7a3a', Lien: '#2A6FA8', '—': 'var(--border-strong)',
};

// ---------- Entrées : journal chronologique du pipe ----------

function EntreesPage() {
  const [scope, setScope] = useState('all');
  const [q, setQ] = useState('');
  const [canal, setCanal] = useState('Tous');
  const today = RADAR_TODAY;
  const dayDiff = (iso) => Math.round((today - new Date(iso)) / 864e5);
  const inScope = (d) => {
    if (scope === 'all') return true;
    if (scope === 'today') return d === 0;
    if (scope === 'yesterday') return d === 1;
    if (scope === 'week') return d >= 0 && d <= 6;
    if (scope === 'month') return d >= 0 && d <= 30;
    return true;
  };
  const CANAUX = ['Tous', 'Slack', 'Notion', 'Tracker', 'Ticket', 'WhatsApp', 'Lien'];
  const SCOPES = [['today', "Aujourd'hui"], ['yesterday', 'Hier'], ['week', '7 jours'], ['month', 'Ce mois'], ['all', 'Tout']];

  let entries = ALL_BRIEFS
    .map((b) => ({ b, d: dayDiff(b.date_recu) }))
    .filter(({ b, d }) => inScope(d)
      && (canal === 'Tous' || b.canal === canal)
      && (!q || (b.title + b.client + b.marque + b.ndeg + (b.responsable || '') + b.entrePar).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => new Date(b.b.date_recu) - new Date(a.b.date_recu));

  const scopeCount = (s) => ALL_BRIEFS.filter((b) => {
    const d = dayDiff(b.date_recu);
    if (s === 'today') return d === 0; if (s === 'yesterday') return d === 1;
    if (s === 'week') return d >= 0 && d <= 6; if (s === 'month') return d >= 0 && d <= 30; return true;
  }).length;

  const relLabel = (d) => d === 0 ? "aujourd'hui" : d === 1 ? 'hier' : d < 7 ? `il y a ${d} j` : d < 31 ? `il y a ${Math.round(d / 7)} sem.` : `il y a ${Math.round(d / 30)} mois`;

  return (
    <React.Fragment>
      <PageHead title="Entrées" sub="Journal du pipe — qui a fait entrer quoi, et quand" action="Export CSV" actionIcon="download" />
      <div style={{ display: 'flex', gap: 6, background: 'var(--paper-100)', borderRadius: 'var(--radius-pill)', padding: 5, width: 'fit-content', marginBottom: 16, flexWrap: 'wrap' }}>
        {SCOPES.map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} style={{
            border: 'none', cursor: 'pointer', padding: '8px 15px', borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            background: scope === k ? 'var(--ink-950)' : 'transparent', color: scope === k ? '#fff' : 'var(--fg2)',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>{l}<span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{scopeCount(k)}</span></button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Icon name="search" size={16} color="var(--fg3)" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un projet, un code, un client, une personne…"
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '11px 16px 11px 42px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', background: 'var(--surface, #fff)', color: 'var(--fg1)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CANAUX.map((c) => (
            <button key={c} onClick={() => setCanal(c)} style={{
              border: canal === c ? 'none' : '1.5px solid var(--border-strong)',
              background: canal === c ? 'var(--ink-950)' : 'transparent', color: canal === c ? '#fff' : 'var(--fg2)',
              padding: '8px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)',
            }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--fg3)', marginBottom: 12 }}><strong>{entries.length}</strong> entrée{entries.length > 1 ? 's' : ''}, du plus récent au plus ancien.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(({ b, d }) => (
          <Card key={b.ndeg} pad={0} style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center', padding: '13px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', fontWeight: 600, lineHeight: 1.3 }}>
                <span style={{ display: 'block', fontSize: 19, color: 'var(--fg1)', lineHeight: 1 }}>{new Date(b.date_recu).getDate()}</span>
                {new Date(b.date_recu).toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: clientColOf(b.client), flexShrink: 0 }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.marque} · {b.client} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{b.ndeg}</span> · {relLabel(d)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-pill)', color: '#fff', background: CANAL_COL[b.canal] || 'var(--border-strong)', whiteSpace: 'nowrap' }}>{b.canal}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                  <span style={{ color: 'var(--fg3)' }}>{b.entrePar}</span>
                  <Icon name="arrow-right" size={13} color="var(--fg4, #a89c8b)" />
                  {b.responsable ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Avatar initials={initialsFromName(b.responsable)} size={22} tint="var(--orange-200)" />{firstNameOf(b.responsable)}</span> : <span style={{ color: 'var(--fg4, #a89c8b)', fontStyle: 'italic' }}>non assigné</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {!entries.length && <Card tone="cream" style={{ padding: 40, textAlign: 'center', color: 'var(--fg3)' }}>Aucune entrée ne correspond à ce filtre.</Card>}
      </div>
    </React.Fragment>
  );
}

// ---------- Gelés / Frozen ----------

function GelesPage() {
  const [q, setQ] = useState('');
  const frozen = ALL_BRIEFS.filter(isFrozenP).filter((b) => !q || (b.title + b.client + b.ndeg + (b.responsable || '')).toLowerCase().includes(q.toLowerCase()));
  const byClient = {};
  frozen.forEach((b) => { (byClient[b.client] = byClient[b.client] || []).push(b); });
  const groups = Object.entries(byClient).sort((a, b) => b[1].length - a[1].length);
  const noResp = frozen.filter((b) => !b.responsable).length;
  return (
    <React.Fragment>
      <PageHead title="Gelés" sub="Dossiers en pause — ni faits, ni perdus. Réactive-les dès qu'une source confirme la reprise." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <Card pad={16} style={{ minWidth: 130 }}><div className="r26-stat" style={{ fontSize: 26, color: '#6FA1B8' }}>{ALL_BRIEFS.filter(isFrozenP).length}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>Dossiers gelés</div></Card>
        <Card pad={16} style={{ minWidth: 130 }}><div className="r26-stat" style={{ fontSize: 26 }}>{groups.length}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>Clients concernés</div></Card>
        <Card pad={16} style={{ minWidth: 130 }}><div className="r26-stat" style={{ fontSize: 26 }}>{noResp}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>Sans responsable</div></Card>
      </div>
      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 22 }}>
        <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Icon name="search" size={16} color="var(--fg3)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '11px 16px 11px 42px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', background: 'var(--surface, #fff)', color: 'var(--fg1)' }} />
      </div>
      {groups.map(([client, arr]) => (
        <div key={client} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: clientColOf(client) }}></span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>{client}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{arr.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {arr.map((b) => (
              <Card key={b.ndeg} pad={0} style={{ boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid #6FA1B8' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{b.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{b.ndeg} · {b.marque}</div>
                    {b.comm && <div style={{ fontSize: 12.5, color: 'var(--fg2)', marginTop: 6, lineHeight: 1.4 }}>❄ {b.comm}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: b.responsable ? 'var(--fg2)' : 'var(--fg4, #a89c8b)', fontStyle: b.responsable ? 'normal' : 'italic' }}>{b.responsable ? firstNameOf(b.responsable) : 'non assigné'}</span>
                    <button style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--orange-600)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Réactiver</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {!frozen.length && <Card tone="cream" style={{ padding: 40, textAlign: 'center', color: 'var(--fg3)' }}>Rien de gelé. ✓</Card>}
    </React.Fragment>
  );
}

// ---------- Historique / Archive ----------

function HistoriquePage() {
  const [q, setQ] = useState('');
  const today = RADAR_TODAY;
  const closed = ALL_BRIEFS.filter((b) => b.closedAt).filter((b) => !q || (b.title + b.client + b.ndeg + (b.responsable || '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  const thisMonth = closed.filter((b) => new Date(b.closedAt).getMonth() === today.getMonth() && new Date(b.closedAt).getFullYear() === today.getFullYear()).length;
  const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const thisQuarter = closed.filter((b) => new Date(b.closedAt) >= quarterStart).length;
  // group by month
  const byMonth = {};
  closed.forEach((b) => { const k = new Date(b.closedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); (byMonth[k] = byMonth[k] || []).push(b); });
  return (
    <React.Fragment>
      <PageHead title="Historique" sub="Tout ce qui est bouclé — du plus récent au plus ancien" action="Export CSV" actionIcon="download" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <Card pad={18}><div className="r26-stat" style={{ fontSize: 32 }}>{closed.length}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4 }}>Clôturés au total</div></Card>
        <Card pad={18}><div className="r26-stat" style={{ fontSize: 32, color: '#1F8A5B' }}>{thisMonth}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4 }}>Ce mois-ci</div></Card>
        <Card pad={18}><div className="r26-stat" style={{ fontSize: 32 }}>{thisQuarter}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4 }}>Ce trimestre</div></Card>
        <Card pad={18}><div className="r26-stat" style={{ fontSize: 32 }}>{closed.filter((b) => b.statutRadar === 'Archivé').length}</div><div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 4 }}>Archivés</div></Card>
      </div>
      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 22 }}>
        <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Icon name="search" size={16} color="var(--fg3)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '11px 16px 11px 42px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', background: 'var(--surface, #fff)', color: 'var(--fg1)' }} />
      </div>
      {Object.entries(byMonth).map(([month, arr]) => (
        <div key={month} style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, textTransform: 'capitalize' }}>{month}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }}></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>{arr.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {arr.map((b) => (
              <Card key={b.ndeg} pad={0} style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 14, alignItems: 'center', padding: '12px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)', fontWeight: 600 }}>
                    <span style={{ display: 'block', fontSize: 17, color: 'var(--fg1)' }}>{new Date(b.closedAt).getDate()}</span>
                    {new Date(b.closedAt).toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: clientColOf(b.client), flexShrink: 0 }}></span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.marque} · {b.client} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{b.ndeg}</span></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: STATUT_COL[b.statutRadar] }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUT_COL[b.statutRadar] }}></span>{b.statutRadar}
                    </span>
                    <IconBtn name="rotate-ccw" variant="cream" size={32} title="Rouvrir" />
                    <IconBtn name="trash-2" variant="cream" size={32} title="Supprimer" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </React.Fragment>
  );
}

Object.assign(window, { EntreesPage, GelesPage, HistoriquePage });
