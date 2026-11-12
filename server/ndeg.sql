-- Unicité du code ndeg par instance — arbitrage 5.7 du 12 novembre 2026.
-- Appliqué à chaque démarrage par initDb (server/pgrest.js), après journal.sql
-- (dont le trigger trace chaque renommage) et après le semis éventuel ;
-- idempotent : une fois la contrainte briefs_ndeg_unique posée, rien ne change.
-- Une base gérée à la main l'applique après journal.sql : psql -f server/ndeg.sql
--
-- Avant la contrainte, les homonymes existants sont dédoublonnés sans rien
-- perdre, dans la transaction de initDb (tout ou rien) :
--   • aucun dossier ni événement n'est supprimé ; seul ndeg change ;
--   • par code, le dossier le plus ancien (created_at, puis id ; date inconnue
--     en dernier) garde le code ; les suivants reçoivent <ndeg>-2, -3… dans
--     l'ordre de création, en sautant tout code déjà employé ailleurs (dossier,
--     commentaire, visuel, journal) : un code attribué ne désigne jamais une
--     ancienne trace ;
--   • un code vide en double n'est pas un code : les suivants deviennent NULL ;
--   • chaque renommage est inscrit dans briefs_ndeg_renommes (valeur d'origine,
--     rang, dossier gardien) et produit son événement « renamed » au journal,
--     avec la confidentialité du dossier ;
--   • commentaires et visuels rattachés par brief_id suivent le nouveau code ;
--     un ancien rattachement par code seul (brief_id NULL) vers un code en
--     double n'est attribué à aucun dossier : ndeg_ambigu = true, conservé.

-- Trace du dédoublonnage : une ligne par dossier renommé, jamais réécrite.
create table if not exists briefs_ndeg_renommes (
  brief_id bigint primary key,        -- dossier renommé (identifiant stable)
  ndeg_origine text not null,         -- code porté avant le dédoublonnage
  ndeg_attribue text,                 -- code attribué ; NULL pour un code vide
  rang int not null,                  -- rang parmi ses homonymes, par ordre de création (2, 3…)
  garde_id bigint not null,           -- dossier le plus ancien, qui garde le code
  at timestamptz not null default now()
);

alter table comments add column if not exists ndeg_ambigu boolean not null default false;
alter table brief_assets add column if not exists ndeg_ambigu boolean not null default false;

create or replace function radar_ndeg_unique()
returns table(doublons int, renommes int, ambigus int, contrainte_posee boolean)
language plpgsql as $$
declare
  g record;
  r record;
  n int;
  k int;
  rang_courant int;
  candidat text;
  gardien bigint;
begin
  doublons := 0; renommes := 0; ambigus := 0; contrainte_posee := false;
  if exists (select 1 from pg_constraint where conname = 'briefs_ndeg_unique' and conrelid = 'briefs'::regclass) then
    return next; return;
  end if;
  -- Aucune écriture concurrente entre le relevé des homonymes et la contrainte.
  lock table briefs in share row exclusive mode;
  for g in select b.ndeg from briefs b where b.ndeg is not null
           group by b.ndeg having count(*) > 1 order by b.ndeg collate "C" loop
    doublons := doublons + 1;
    select b.id into gardien from briefs b where b.ndeg = g.ndeg order by b.created_at asc nulls last, b.id asc limit 1;
    update comments c set ndeg_ambigu = true where c.brief_id is null and c.ndeg = g.ndeg;
    get diagnostics n = row_count; ambigus := ambigus + n;
    update brief_assets a set ndeg_ambigu = true where a.brief_id is null and a.ndeg = g.ndeg;
    get diagnostics n = row_count; ambigus := ambigus + n;
    rang_courant := 1; k := 1;
    for r in select b.id from briefs b where b.ndeg = g.ndeg
             order by b.created_at asc nulls last, b.id asc offset 1 loop
      rang_courant := rang_courant + 1;
      if btrim(g.ndeg) = '' then
        candidat := null;
      else
        loop
          k := k + 1;
          candidat := g.ndeg || '-' || k;
          exit when not exists (select 1 from briefs b where b.ndeg = candidat)
            and not exists (select 1 from comments c where c.ndeg = candidat)
            and not exists (select 1 from brief_assets a where a.ndeg = candidat)
            and not exists (select 1 from task_events e where e.ndeg = candidat);
        end loop;
      end if;
      insert into briefs_ndeg_renommes (brief_id, ndeg_origine, ndeg_attribue, rang, garde_id)
        values (r.id, g.ndeg, candidat, rang_courant, gardien);
      update briefs b set ndeg = candidat where b.id = r.id;
      if candidat is not null then
        update comments c set ndeg = candidat where c.brief_id = r.id;
        update brief_assets a set ndeg = candidat where a.brief_id = r.id;
      end if;
      renommes := renommes + 1;
    end loop;
  end loop;
  alter table briefs add constraint briefs_ndeg_unique unique (ndeg);
  -- L'index unique de la contrainte remplace l'ancien index de recherche.
  drop index if exists briefs_ndeg_idx;
  contrainte_posee := true;
  return next;
end;
$$;

select * from radar_ndeg_unique();
