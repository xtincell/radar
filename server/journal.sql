-- Aucune requalification de l'histoire : NULL signifie confidentialité inconnue.
alter table task_events add column if not exists brief_id bigint;
alter table task_events add column if not exists private_to text;
-- Qualification minimale au moment du fait. Aucun remplissage rétroactif :
-- les anciens événements ne prouvent pas leur responsable ni leur période.
alter table task_events add column if not exists scope_snapshot jsonb;
-- Les nouveaux rattachements suivent l'identifiant, pas un code réutilisable.
-- Les anciens restent explicitement non qualifiés ; aucune attribution inventée.
alter table comments add column if not exists brief_id bigint;
alter table brief_assets add column if not exists brief_id bigint;
create index if not exists comments_brief_id_idx on comments(brief_id);
create index if not exists brief_assets_brief_id_idx on brief_assets(brief_id);
create index if not exists task_events_brief_id_idx on task_events(brief_id);

create or replace function radar_journal_brief() returns trigger language plpgsql as $$
declare
  b briefs%rowtype;
  k text;
  s text;
  priv text;
begin
  if TG_OP = 'DELETE' then
    b := OLD; k := 'deleted'; s := 'Supprimé'; priv := coalesce(OLD.private_to, '');
  elsif TG_OP = 'INSERT' then
    b := NEW; k := 'created'; s := 'Nouvelle entrée'; priv := coalesce(NEW.private_to, '');
  else
    if (to_jsonb(NEW) - 'updated_at') is not distinct from (to_jsonb(OLD) - 'updated_at') then return NEW; end if;
    b := NEW;
    -- Un passage privé → public ne publie pas le contenu privé de cette transition.
    priv := coalesce(nullif(NEW.private_to,''), nullif(OLD.private_to,''), '');
    if NEW.statut is distinct from OLD.statut then
      if NEW.statut = 'Frozen' then k := 'frozen'; s := 'Tâche gelée';
      elsif OLD.statut = 'Frozen' then k := 'unfrozen'; s := 'Tâche réactivée';
      elsif NEW.statut = any(array['Livré','Livre','Closed','Clôturé','Cloture','Terminé','Termine']) then k := 'closed'; s := 'Clôturé : ' || NEW.statut;
      elsif OLD.statut = any(array['Livré','Livre','Closed','Clôturé','Cloture','Terminé','Termine']) then k := 'reopened'; s := 'Rouvert : ' || coalesce(NEW.statut,'—');
      else k := 'status'; s := coalesce(OLD.statut,'—') || ' → ' || coalesce(NEW.statut,'—'); end if;
    elsif NEW.responsable is distinct from OLD.responsable then k := 'reassigned'; s := coalesce(OLD.responsable,'—') || ' → ' || coalesce(NEW.responsable,'—');
    elsif NEW.deadline is distinct from OLD.deadline then k := 'deadline'; s := 'Échéance → ' || coalesce(NEW.deadline,'—');
    elsif NEW.private_to is distinct from OLD.private_to then k := 'visibility'; s := 'Confidentialité modifiée';
    else k := 'updated'; s := 'Dossier modifié'; end if;
  end if;
  insert into task_events(brief_id,private_to,scope_snapshot,ndeg,entree,client,projet,kind,statut_old,statut_new,resp_old,resp_new,summary)
  values (b.id,priv,jsonb_build_object('private_to',priv,'responsable',b.responsable,'deadline',b.deadline,'statut',b.statut,'closed_at',b.closed_at),b.ndeg,b.entree,b.client,b.projet,k,
    case when TG_OP <> 'INSERT' then OLD.statut end,
    case when TG_OP <> 'DELETE' then NEW.statut end,
    case when TG_OP <> 'INSERT' then OLD.responsable end,
    case when TG_OP <> 'DELETE' then NEW.responsable end,s);
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
drop trigger if exists radar_journal_brief on briefs;
create trigger radar_journal_brief after insert or update or delete on briefs
for each row execute function radar_journal_brief();
