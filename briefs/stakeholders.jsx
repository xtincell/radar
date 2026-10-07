// Dashboard R26 × Radar — Stakeholders & desiderata par marque/client.
// Traqués par personne et/ou par marché, et SURFACÉS AUTOMATIQUEMENT là où on
// crée ou consulte : fiche projet Studio, modale brief, Nouveau ticket.

const STAKEHOLDERS = {
  'Panza Foods': {
    people: [
      { qui: 'Mme Ekindi', role: 'Dir. Marketing — décideuse finale', notes: ['Déteste les fonds violets', 'Veut toujours voir 2 pistes minimum'] },
      { qui: 'Chef de produit', role: 'Produit', notes: ['Packshot gamme premium visible sur tout visuel'] },
    ],
    marches: { 'Cameroun': ['Mention « Sans conservateurs » obligatoire'] },
  },
  'Bonnet Rouge': {
    people: [
      { qui: 'M. Tchoupo', role: 'DG — validation finale', notes: ['Logo jamais en blanc', 'Validation religieuse systématique pendant le Ramadan'] },
    ],
    marches: { 'Cameroun': ['Sous-titres FR + AR sur tout film'] },
  },
  'AGL': {
    people: [
      { qui: 'Comité de marque', role: 'Board — valide par phase', notes: ['Bleu AGL non négociable', 'Jamais de validation globale : phase par phase'] },
    ],
    marches: { "Côte d'Ivoire": ['Bilingue FR / EN obligatoire'] },
  },
  'Payboard': {
    people: [
      { qui: 'CEO', role: 'Décideur unique', notes: ['Valide en 24h — exige la même vitesse en face', 'Pas de jargon fintech'] },
    ],
    marches: {},
  },
};

function stakeFor(client) {
  const s = STAKEHOLDERS[client];
  if (!s) return [];
  const out = [];
  (s.people || []).forEach((p) => p.notes.forEach((n) => out.push({ qui: p.qui, role: p.role, txt: n, kind: 'personne' })));
  Object.entries(s.marches || {}).forEach(([m, arr]) => arr.forEach((n) => out.push({ qui: `Marché ${m}`, role: 'règle de marché', txt: n, kind: 'marche' })));
  return out;
}

// Strip réutilisable — compact pour modale/ticket, complet pour la fiche Studio
function StakeStrip({ client, compact }) {
  const items = stakeFor(client);
  if (!items.length) return null;
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--orange-50)', padding: compact ? '10px 13px' : '13px 15px' }}>
      <div className="r26-label" style={{ color: 'var(--orange-700)', fontSize: 10, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="shield-alert" size={13} color="var(--orange-700)" /> Desiderata à respecter · {client}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 5 : 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: compact ? 12 : 12.5, lineHeight: 1.45 }}>
            <span style={{ fontWeight: 700, color: it.kind === 'marche' ? '#8A6428' : 'var(--fg1)', flexShrink: 0 }}>{it.qui}</span>
            <span style={{ color: 'var(--fg2)', flex: 1 }}>{it.txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { STAKEHOLDERS, stakeFor, StakeStrip });
