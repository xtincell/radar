// Dashboard R26 × Radar — Évaluation département (santé collective, comparé, cadences)

function EvalDeptView() {
  const team = window.TEAM || [];
  const active = ALL_BRIEFS.filter(isActiveP);
  const closed = ALL_BRIEFS.filter((b) => DONE_RADAR.has(b.statutRadar) || b.closedAt);
  const late = active.filter(isLateP).length;
  const frozen = ALL_BRIEFS.filter(isFrozenP).length;
  const rate = ALL_BRIEFS.length ? Math.round((closed.length / ALL_BRIEFS.length) * 100) : 0;

  // per-member delivery from briefs
  const perMember = (init, name) => {
    const mine = ALL_BRIEFS.filter((b) => initialsFromName(b.responsable) === init || b.responsable === name);
    return {
      bouclés: mine.filter((b) => DONE_RADAR.has(b.statutRadar) || b.closedAt).length,
      actifs: mine.filter(isActiveP).length,
      alerte: mine.filter((b) => isActiveP(b) && (isLateP(b) || b.statutRadar === 'Bloqué')).length,
    };
  };

  const CADENCE = {
    NM: { rythme: 'Hebdomadaire', levier: 'Autonomie + arbitrages clairs', qui: 'Responsable' },
    LP: { rythme: 'Bi-hebdomadaire', levier: 'Protéger des délais trop courts', qui: 'Les deux' },
    KA: { rythme: 'Quotidienne (pics)', levier: 'Répartir la surcharge', qui: 'Responsable' },
    SD: { rythme: 'Hebdomadaire', levier: 'Cadrage motion en amont', qui: 'Membre' },
    MB: { rythme: 'À la demande', levier: 'Reconnaissance + volume', qui: 'Membre' },
  };

  const KPI = ({ v, label, tone }) => {
    const col = tone === 'alert' ? '#B4472E' : tone === 'go' ? '#1F8A5B' : tone === 'warn' ? 'var(--orange-600)' : '#fff';
    return (
      <div style={{ background: 'var(--ink-950)', borderRadius: 'var(--radius-md, 14px)', padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: col, lineHeight: 1 }}>{v}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(247,242,234,0.6)', marginTop: 6 }}>{label}</div>
      </div>
    );
  };

  return (
    <React.Fragment>
      {/* Santé du département */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, marginBottom: 6 }}>Santé du département</div>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--fg2)', maxWidth: 720, lineHeight: 1.55 }}>
          Le talent et l'effort sont rarement le problème — la <strong>visibilité</strong> et la <strong>coordination</strong> le sont. Cette vue collective les rend lisibles.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          <KPI v={team.length} label="Membres" />
          <KPI v={`${rate}%`} label="Taux de bouclage" tone="go" />
          <KPI v={closed.length} label="Livrables bouclés" tone="go" />
          <KPI v={active.length} label="Tâches actives" tone="warn" />
          <KPI v={late} label="Actives en retard" tone="alert" />
          <KPI v={frozen} label="Dossiers gelés" />
        </div>
      </Card>

      {/* Tableau comparé */}
      <Card style={{ marginBottom: 20 }}>
        <CardHead title="Tableau comparé — livraison" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                {['Membre', 'Rôle', 'Charge', 'Bouclés', 'Actifs', 'Alerte', 'État'].map((h, i) => (
                  <th key={h} style={{ textAlign: i < 2 ? 'left' : 'right', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', fontWeight: 700, borderBottom: '1.5px solid var(--border-strong)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const s = perMember(m.init, m.name);
                const state = m.load >= 85 ? { label: 'Surchargé', col: '#B4472E' } : s.alerte > 0 ? { label: 'À surveiller', col: '#C99A5B' } : { label: 'Sain', col: '#1F8A5B' };
                return (
                  <tr key={m.init} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontWeight: 600 }}>
                        <Avatar initials={m.init} size={26} tint="var(--orange-200)" />{m.name}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', color: 'var(--fg2)' }}>{m.role}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: m.load >= 85 ? '#B4472E' : 'var(--fg1)' }}>{m.load}%</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#1F8A5B', fontWeight: 700 }}>{s.bouclés}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.actifs}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.alerte ? '#B4472E' : 'var(--fg3)', fontWeight: s.alerte ? 700 : 400 }}>{s.alerte || '—'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: state.col }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: state.col }}></span>{state.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--fg3)', lineHeight: 1.5 }}>
          Certains coordonnent surtout à l'oral : leur charge « tracée » peut sous-représenter leur activité réelle — à vérifier avant conclusion.
        </p>
      </Card>

      {/* Cadences par profil */}
      <Card style={{ marginBottom: 20 }}>
        <CardHead title="Cadences par profil" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                {['Membre', 'Cadence à adopter', 'Levier', 'Qui s\'adapte'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg3)', fontWeight: 700, borderBottom: '1.5px solid var(--border-strong)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const c = CADENCE[m.init] || {};
                return (
                  <tr key={m.init} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 600 }}>{firstNameOf(m.name)}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--fg2)' }}>{c.rythme}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--fg2)' }}>{c.levier}</td>
                    <td style={{ padding: '11px 12px' }}><Chip variant="outline" style={{ fontSize: 11, padding: '3px 10px' }}>{c.qui}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confidential band */}
      <div style={{ borderRadius: 'var(--radius-lg, 18px)', padding: '18px 20px', position: 'relative', background: 'repeating-linear-gradient(135deg, #1b1714, #1b1714 14px, #1f1a16 14px, #1f1a16 28px)', color: '#F7F2EA', border: '1px solid #000' }}>
        <span style={{ position: 'absolute', top: 14, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2A1505', background: 'var(--orange-400, #FFAA6E)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>🔒 Pour toi seul</span>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Lecture politique — notes internes</div>
        <p style={{ margin: 0, fontSize: 13.5, color: '#D9CFC0', lineHeight: 1.55, maxWidth: 720 }}>
          Section réservée à la lecture sensible (perception interne, tensions, positionnement). Rédigée au cas par cas, masquée en mode partage, jamais transmise telle quelle.
        </p>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { EvalDeptView });
