-- Migration : Colonnes JSONB pour la structure complète des 4 documents agence
-- À appliquer sur la base Supabase « NEFER RADAR » (fftfrfvllpukesgfgkms)
-- Sûr et idempotent.

alter table public.briefs
  add column if not exists brief_client jsonb,
  add column if not exists brief_creatif jsonb,
  add column if not exists brief_production jsonb,
  add column if not exists case_study jsonb;

comment on column public.briefs.brief_client is
  'Données structurées du brief client (Pourquoi on agit : contextes, problème marketing, objectifs, cibles, insight, axes, contraintes).';

comment on column public.briefs.brief_creatif is
  'Données structurées du brief créatif / direction créative (Quelle idée on recommande : claims, challenges, principes, concepts, DA, copy).';

comment on column public.briefs.brief_production is
  'Données structurées du brief de production (Quoi produire exactement : livrables précis, gabarit slide par slide, assets requis, spécifications, checklist).';

comment on column public.briefs.case_study is
  'Données structurées du case study / étude de cas (Ce qu''on raconte après exécution : challenge, insight, stratégie, idée, exécution, KPIs, learnings).';
