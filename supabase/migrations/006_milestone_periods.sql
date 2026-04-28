-- ============================================================================
-- 006_milestone_periods.sql
--
-- Les jalons de production ne tombent presque jamais sur une seule date :
-- l'échéancier SILA parle en mois ou en plages ("mai-juin 2026"). On remplace
-- la colonne `date` par une période `start_date` + `end_date`. Une jalon
-- ponctuel garde simplement `start_date = end_date`.
--
-- La migration préserve les données existantes (recopie `date` dans les deux
-- nouvelles colonnes) avant de supprimer l'ancienne. Elle met aussi à jour
-- le trigger d'activity_log pour détecter les changements de période.
-- ============================================================================

alter table public.milestones
  add column start_date date,
  add column end_date   date;

update public.milestones
   set start_date = date,
       end_date   = date;

alter table public.milestones
  alter column start_date set not null,
  alter column end_date   set not null;

alter table public.milestones
  add constraint milestones_period_check check (end_date >= start_date);

drop index if exists milestones_date_idx;
create index milestones_start_date_idx on public.milestones(start_date);
create index milestones_end_date_idx   on public.milestones(end_date);

alter table public.milestones drop column date;

-- Trigger d'activity_log : remplacer la détection sur `date` par start_date / end_date.
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

    if TG_OP = 'UPDATE'
       and NEW.title      is not distinct from OLD.title
       and NEW.start_date is not distinct from OLD.start_date
       and NEW.end_date   is not distinct from OLD.end_date then
      return NEW;
    end if;

  elsif TG_TABLE_NAME = 'budget_lines' then
    proj_id  := COALESCE(NEW.project_id, OLD.project_id);
    ent_type := 'budget_line';
    ent_id   := COALESCE(NEW.id, OLD.id);
    metadata_json := jsonb_build_object('category', COALESCE(NEW.category, OLD.category));

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
