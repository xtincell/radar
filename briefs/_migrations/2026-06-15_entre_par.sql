-- Migration : champ « Entré par » (demandeur, distinct du responsable/exécutant)
-- À appliquer sur la base Supabase « NEFER RADAR » (fftfrfvllpukesgfgkms)
-- APRÈS l'avoir réactivée et AVANT toute insertion de ticket portant ce champ.
-- Sûr et idempotent.

alter table public.briefs
  add column if not exists entre_par text;

comment on column public.briefs.entre_par is
  'Qui a fait entrer la demande dans le pipe (compte/coordination), distinct de responsable (exécutant). Alimente le « par qui » du journal des entrées.';
