// Dashboard R26 × Radar — Gabarits : schéma COMPLET (clés réelles de la base)
// Sections + libellés dérivés des blobs JSONB brief_client / brief_creatif /
// brief_production / case_study + suivi (voir migrations Radar). Chaque champ :
// [key, label, kind] où kind ∈ 'short' | 'long' | 'list'.

const GABARIT_SCHEMA = {
  suivi: [
    { title: 'Pitch & origine', fields: [
      ['pitch', 'Pitch projet', 'long'], ['brief_source', 'Origine du brief', 'short'], ['tension_marche', 'Tension marché', 'long'],
    ]},
    { title: 'Planning étalon', fields: [
      ['duree_etalon', 'Durée étalon', 'short'], ['date_etalon', 'Date étalon', 'short'], ['marge', 'Marge agence', 'short'],
      ['delai_realiste', 'Délai réaliste', 'short'], ['lecture', 'Lecture planning', 'long'],
    ]},
    { title: 'Production & marché', fields: [
      ['dimensions', 'Dimensions / formats', 'list'], ['langue', 'Langue de production', 'short'], ['claim_retenu', 'Claim retenu', 'short'], ['specificites', 'Spécificités', 'list'],
    ]},
    { title: 'Validation', fields: [
      ['interlocuteur', 'Interlocuteur', 'short'], ['interlocuteur_role', 'Rôle', 'short'], ['conditions', 'Conditions de validation', 'list'], ['vigilance', 'Point de vigilance', 'long'],
    ]},
  ],
  client: [
    { title: 'Contexte', fields: [
      ['contexte_business', 'Contexte business', 'long'], ['contexte_marque', 'Contexte marque', 'long'], ['contexte_market', 'Contexte marché', 'long'], ['contexte_com', 'Contexte communication', 'long'],
    ]},
    { title: 'Problème & objectifs', fields: [
      ['probleme_marketing', 'Problème marketing', 'long'], ['obj_business', 'Objectif business', 'long'], ['obj_marketing', 'Objectif marketing', 'long'], ['obj_communication', 'Objectif communication', 'long'],
    ]},
    { title: 'Cible', fields: [
      ['cible_principale', 'Cible principale', 'long'], ['cible_secondaire', 'Cible secondaire', 'short'], ['cible_socio_eco', 'Profil socio-éco', 'short'], ['cible_situation', 'Situation', 'short'],
      ['cible_frein', 'Frein', 'long'], ['cible_motivation', 'Motivation', 'long'], ['cible_langage', 'Langage / codes', 'short'],
    ]},
    { title: 'Idée directrice', fields: [
      ['insight_client', 'Insight client', 'long'], ['big_idea', 'Big idea', 'long'],
    ]},
    { title: 'Axe créatif 1', fields: [
      ['axe1_nom', 'Nom', 'short'], ['axe1_intention', 'Intention', 'long'], ['axe1_promesse', 'Promesse', 'short'], ['axe1_ton', 'Ton', 'short'],
      ['axe1_copy_p', 'Copy principal', 'short'], ['axe1_copy_s', 'Copy secondaire', 'short'], ['axe1_preuve', 'Preuve', 'long'],
    ]},
    { title: 'Axe créatif 2', fields: [
      ['axe2_nom', 'Nom', 'short'], ['axe2_intention', 'Intention', 'long'], ['axe2_promesse', 'Promesse', 'short'], ['axe2_ton', 'Ton', 'short'],
      ['axe2_copy_p', 'Copy principal', 'short'], ['axe2_copy_s', 'Copy secondaire', 'short'], ['axe2_preuve', 'Preuve', 'long'],
    ]},
    { title: 'Contraintes', fields: [
      ['contrainte_marque', 'Marque', 'short'], ['contrainte_legale', 'Légale', 'short'], ['contrainte_culturelle', 'Culturelle', 'short'],
      ['contrainte_produit', 'Produit', 'short'], ['contrainte_format', 'Format', 'short'], ['contrainte_delai', 'Délai', 'short'],
    ]},
  ],
  crea: [
    { title: 'Cadre créatif', fields: [
      ['status_validation', 'Statut validation', 'short'], ['message_claim', 'Message / claim', 'short'], ['challenge_creatif', 'Challenge créatif', 'long'], ['principe_creatif', 'Principe créatif', 'long'],
    ]},
    { title: 'Concept 1', fields: [
      ['concept1_nom', 'Nom', 'short'], ['concept1_axe', 'Axe', 'short'], ['concept1_piste', 'Piste', 'long'], ['concept1_croisement', 'Croisement', 'short'],
      ['concept1_univers', 'Univers', 'short'], ['concept1_safe', 'Version safe', 'short'], ['concept1_reco', 'Reco agence', 'short'], ['concept1_money', 'Budget / faisabilité', 'short'],
    ]},
    { title: 'Concept 2', fields: [
      ['concept2_nom', 'Nom', 'short'], ['concept2_axe', 'Axe', 'short'], ['concept2_piste', 'Piste', 'long'],
    ]},
    { title: 'Direction artistique', fields: [
      ['da_style_image', 'Style image', 'short'], ['da_lumiere', 'Lumière', 'short'], ['da_cadrage', 'Cadrage', 'short'], ['da_decor', 'Décor', 'short'], ['da_styling', 'Styling', 'short'],
      ['da_attitude', 'Attitude', 'short'], ['da_palette', 'Palette', 'short'], ['da_typo', 'Typographie', 'short'], ['da_retouche', 'Retouche', 'short'],
    ]},
    { title: 'Copy', fields: [
      ['copy_claim', 'Claim', 'short'], ['copy_accroche', 'Accroche', 'short'], ['copy_explication', 'Explication', 'long'], ['copy_cta', 'Call-to-action', 'short'], ['reco_agence', 'Reco agence', 'long'],
    ]},
  ],
  prod: [
    { title: 'Cadre production', fields: [
      ['status_production', 'Statut production', 'short'], ['livrable_principal', 'Livrable principal', 'short'], ['nb_slides', 'Nb slides / éléments', 'short'], ['ratio', 'Ratio', 'short'],
      ['plateformes', 'Plateformes', 'list'], ['responsable_prod', 'Responsable prod', 'short'], ['deadline_prod', 'Deadline prod', 'short'],
    ]},
    { title: 'Spécifications', fields: [
      ['spec_social_portrait', 'Social portrait', 'short'], ['spec_carre', 'Carré', 'short'], ['spec_story', 'Story', 'short'], ['spec_export', 'Export', 'short'],
      ['spec_safety_zone', 'Zone de sécurité', 'short'], ['spec_file_weight', 'Poids fichier', 'short'], ['spec_naming', 'Nomenclature', 'short'],
    ]},
  ],
  cs: [
    { title: 'Récit', fields: [
      ['status_validation', 'Statut', 'short'], ['big_idea', 'Big idea', 'long'], ['challenge', 'Challenge', 'long'], ['insight', 'Insight', 'long'],
      ['strategie', 'Stratégie', 'long'], ['concept_retenu', 'Concept retenu', 'short'], ['execution', 'Exécution', 'long'], ['da', 'Direction artistique', 'short'],
    ]},
    { title: 'KPIs', fields: [
      ['kpi_portee', 'Portée', 'short'], ['kpi_impressions', 'Impressions', 'short'], ['kpi_engagement', 'Engagement', 'short'], ['kpi_taux_eng', 'Taux engagement', 'short'],
      ['kpi_clics', 'Clics', 'short'], ['kpi_leads', 'Leads', 'short'], ['kpi_sentiment', 'Sentiment', 'short'], ['kpi_verbatims', 'Verbatims', 'long'], ['kpi_reutilisabilite', 'Réutilisabilité', 'short'],
    ]},
    { title: 'Learnings', fields: [
      ['learning_ok', 'Ce qui a marché', 'long'], ['learning_improve', 'À améliorer', 'long'], ['learning_platform', 'Par plateforme', 'long'], ['learning_industrial', 'Industrialisable', 'long'], ['learning_sell', 'Argument commercial', 'long'],
    ]},
  ],
};

const VOLETS = [
  { key: 'suivi', label: 'Général & suivi', icon: 'compass' },
  { key: 'client', label: 'Brief client', icon: 'target' },
  { key: 'crea', label: 'Brief créatif / DA', icon: 'palette' },
  { key: 'prod', label: 'Brief production', icon: 'package' },
  { key: 'cs', label: 'Case study', icon: 'award' },
];

Object.assign(window, { GABARIT_SCHEMA, VOLETS });
