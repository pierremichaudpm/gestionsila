-- ============================================================================
-- 004_activity_triggers.sql
--
-- Trace automatique dans activity_log pour les opérations significatives
-- sur documents, deliverables, milestones, budget_lines.
--
-- Stratégie : INSERT toujours loggué ; UPDATE seulement quand un champ
-- "intéressant" change (validation_status, status, date, title, …) — sinon
-- l'édition inline du budget polluerait le journal.
-- ============================================================================

create or replace function public.log_activity()
returns trigger
language plpgsql
as $$
declare
  proj_id        uuid;
  ent_type       text;
  ent_id         uuid;
  metadata_json  jsonb;
  action_str     text;
begin
  if TG_OP = 'INSERT' then
    action_str := 'created';
  elsif TG_OP = 'UPDATE' then
    action_str := 'updated';
  end if;

  if TG_TABLE_NAME = 'documents' then
    proj_id  := COALESCE(NEW.project_id, OLD.project_id);
    ent_type := 'document';
    ent_id   := COALESCE(NEW.id, OLD.id);
    metadata_json := jsonb_build_object('title', COALESCE(NEW.title, OLD.title));

    -- Sur UPDATE : ne logguer que les transitions de statut de validation
    if TG_OP = 'UPDATE' then
      if NEW.validation_status is distinct from OLD.validation_status then
        if    NEW.validation_status = 'pending'  then action_str := 'submitted';
        elsif NEW.validation_status = 'approved' then action_str := 'approved';
        elsif NEW.validation_status = 'archived' then action_str := 'archived';
        else  action_str := 'updated';
        end if;
      else
        return NEW;
      end if;
    end if;

  elsif TG_TABLE_NAME = 'deliverables' then
    proj_id  := public.funder_project_id(COALESCE(NEW.funder_id, OLD.funder_id));
    ent_type := 'deliverable';
    ent_id   := COALESCE(NEW.id, OLD.id);
    metadata_json := jsonb_build_object('title', COALESCE(NEW.title, OLD.title));

    -- Sur UPDATE : ne logguer que les changements de statut
    if TG_OP = 'UPDATE' and NEW.status is not distinct from OLD.status then
      return NEW;
    end if;

  elsif TG_TABLE_NAME = 'milestones' then
    proj_id  := COALESCE(NEW.project_id, OLD.project_id);
    ent_type := 'milestone';
    ent_id   := COALESCE(NEW.id, OLD.id);
    metadata_json := jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title),
      'type',  COALESCE(NEW.type,  OLD.type)
    );

    -- Sur UPDATE : logguer si title ou date a changé
    if TG_OP = 'UPDATE'
       and NEW.title is not distinct from OLD.title
       and NEW.date  is not distinct from OLD.date then
      return NEW;
    end if;

  elsif TG_TABLE_NAME = 'budget_lines' then
    proj_id  := COALESCE(NEW.project_id, OLD.project_id);
    ent_type := 'budget_line';
    ent_id   := COALESCE(NEW.id, OLD.id);
    metadata_json := jsonb_build_object('category', COALESCE(NEW.category, OLD.category));

    -- Édition inline trop bruyante : on ne logge que les créations
    if TG_OP = 'UPDATE' then
      return NEW;
    end if;
  end if;

  if proj_id is not null and auth.uid() is not null then
    insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
    values (proj_id, auth.uid(), action_str, ent_type, ent_id, metadata_json);
  end if;

  return COALESCE(NEW, OLD);
end $$;

create trigger documents_log_activity
  after insert or update on public.documents
  for each row execute function public.log_activity();

create trigger deliverables_log_activity
  after insert or update on public.deliverables
  for each row execute function public.log_activity();

create trigger milestones_log_activity
  after insert or update on public.milestones
  for each row execute function public.log_activity();

create trigger budget_lines_log_activity
  after insert or update on public.budget_lines
  for each row execute function public.log_activity();
