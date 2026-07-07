-- ============================================================
-- Matanga RADAR — extension du modèle pour le deck « Gabarits »
-- Ajoute la colonne JSONB `suivi` à public.briefs.
--
-- Contexte : le deck de présentation (briefs/gabarits.html) est
-- intégralement piloté par les données (mode « que du live »). Les
-- onglets 1→4 réutilisent les blobs existants (brief_client,
-- brief_creatif, brief_production, case_study). L'onglet 0
-- (Général & Suivi) a besoin de champs de présentation qui
-- n'existaient pas encore : ils vivent dans `suivi`.
--
-- JSONB = sans schéma : aucune migration future n'est requise pour
-- ajouter/retirer une clé. À exécuter une seule fois (idempotent).
-- ============================================================

alter table public.briefs
  add column if not exists suivi jsonb not null default '{}'::jsonb;

comment on column public.briefs.suivi is
  'Champs de présentation de l''onglet Général & Suivi (deck gabarits.html). Clés attendues :
   pitch (text)            — accroche projet (slide cover)
   brief_source (text)     — origine du brief (ex. "Slack · #canal")
   duree_etalon (text)     — durée étalon lisible (ex. "10 jours")
   date_etalon (text)      — date étalon (ex. "2025-06-04")
   marge (text)            — marge agence (ex. "+5 j")
   delai_realiste (text)   — délai réaliste agence (ex. "2025-06-11")
   lecture (text)          — narration planning (paragraphe)
   dimensions (text[])     — formats/dimensions (ex. ["Carrousel 4:5","KV maître","Story 9:16"])
   langue (text)           — langue de production
   claim_retenu (text)     — claim retenu (repli sur brief_creatif.copy_claim)
   specificites (text[])   — spécificités / obligations
   tension_marche (text)   — tension marché (paragraphe)
   interlocuteur (text)    — décideur validation (ex. "Direction Marketing X")
   interlocuteur_role (text)
   conditions (text[])     — conditions de validation
   vigilance (text)        — point de vigilance
   contexte_pertinent (text)';

-- Exemple de remplissage (facultatif) pour la tâche NSI-002 :
-- update public.briefs set suivi = jsonb_build_object(
--   'pitch','NSIA Tontines · recruter des souscriptrices en héroïsant les présidentes de tontine.',
--   'brief_source','Slack · #nsia-tontines',
--   'duree_etalon','10 jours',
--   'date_etalon','2025-06-04',
--   'marge','+5 j',
--   'delai_realiste','2025-06-11',
--   'langue','Français',
--   'interlocuteur','Direction Marketing NSIA',
--   'interlocuteur_role','décideur validation'
-- ) where ndeg = 'NSI-002';
