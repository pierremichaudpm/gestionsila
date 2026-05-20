-- ============================================================================
-- 031_tasks_module.sql
--
-- Module Tâches — Kanban collaboratif (Phase A)
--
-- La table tasks existe depuis 001 mais avec un schéma minimal dédié au
-- tracking intra-lot. Ce module la réécrit comme entité centrale du module
-- Tâches : visible par tous les membres, modifiable par tous, pas de
-- cloisonnement par pays.
--
-- ALTÉRATIONS de l'existant :
--   - lot_id         : NOT NULL → NULL (tâches transversales)
--                      ON DELETE CASCADE → ON DELETE SET NULL
--   - phase          : DROP constraint CHECK + rendre nullable (champ libre)
--   - status         : étend le CHECK (+validated)
--   - end_date       : renommé en due_date
--   - depends_on     : passe de uuid FK scalaire à uuid[] (dépendances multiples)
--
-- NOUVELLES COLONNES (22) : project_id, milestone_id, external_id,
--   description, acte, discipline, priority, progress_pct, estim_hours,
--   actual_hours, deliverable, validation_notes, notes, country, position,
--   archived, archived_at, archived_by, created_by, last_modified_by,
--   last_modified_at, updated_at
--
-- RLS : refonte complète — vision collaborative ouverte.
--   Lecture : tout membre du projet.
--   Écriture : tout membre (sauf suppression : admin only).
--
-- TRIGGERS :
--   tasks_set_updated_at            : BEFORE UPDATE → updated_at
--   tasks_protect_created_by        : BEFORE INSERT/UPDATE → created_by figé
--   tasks_set_last_modified         : BEFORE UPDATE → last_modified_by/at
--   tasks_protect_archive_columns   : BEFORE INSERT/UPDATE → archived_at/by
--   tasks_log_activity              : AFTER INSERT/UPDATE → activity_log
--
-- COMMENTAIRES :
--   Étend comments.entity_type_check pour inclure 'task'.
--   Réécrit log_comment_activity pour résoudre le titre depuis tasks aussi.
-- ============================================================================

begin;

-- ============================================================================
-- 1. ALTÉRATIONS STRUCTURELLES
-- ============================================================================

-- lot_id devient nullable (tâches transversales sans lot spécifique)
alter table public.tasks
  alter column lot_id drop not null;

-- Changer ON DELETE CASCADE → ON DELETE SET NULL pour lot_id
alter table public.tasks
  drop constraint tasks_lot_id_fkey;
alter table public.tasks
  add constraint tasks_lot_id_fkey
    foreign key (lot_id) references public.lots(id) on delete set null;

-- phase : drop contrainte enum rigide + rendre nullable (champ libre)
alter table public.tasks
  drop constraint tasks_phase_check,
  alter column phase drop not null;

-- status : étendre le CHECK à 5 valeurs
alter table public.tasks
  drop constraint tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'validated'));

-- end_date → due_date
alter table public.tasks
  rename column end_date to due_date;

-- depends_on : passe de FK scalaire à uuid[]
alter table public.tasks
  drop constraint tasks_depends_on_fkey,
  drop column depends_on;
alter table public.tasks
  add column depends_on uuid[] not null default array[]::uuid[];

-- ============================================================================
-- 2. NOUVELLES COLONNES
-- ============================================================================

alter table public.tasks
  -- Référencement projet direct (critique pour RLS sans passer par lot_id)
  add column project_id     uuid          references public.projects(id) on delete cascade,

  -- Lien jalon optionnel (sans FK obligatoire — le lot_id peut être null)
  add column milestone_id   uuid          references public.milestones(id) on delete set null,

  -- ID externe pour import Excel futur (Phase B)
  add column external_id    text,

  -- Détail
  add column description    text,

  -- Catégorisation libre (pas d'enum — on découvre en prod)
  add column acte           text,
  add column discipline     text,

  -- Priorité (P0 critique → P3 bas)
  add column priority       text          not null default 'p2'
    check (priority in ('p0', 'p1', 'p2', 'p3')),

  -- Avancement (0.00 → 1.00)
  add column progress_pct   decimal(3,2)  not null default 0
    check (progress_pct >= 0 and progress_pct <= 1),

  -- Effort estimé vs réel
  add column estim_hours    int,
  add column actual_hours   int,

  -- Livrable associé et notes de validation
  add column deliverable      text,
  add column validation_notes text,
  add column notes            text,

  -- Pays (traçabilité et couleur de bordure dans le Kanban)
  add column country        char(2),

  -- Position dans la colonne Kanban pour le drag-drop
  add column position       decimal       not null default 0,

  -- Archivage (pattern 025 — milestones)
  add column archived       boolean       not null default false,
  add column archived_at    timestamptz,
  add column archived_by    uuid          references public.users(id) on delete set null,

  -- Audit (pattern 018/019)
  add column created_by       uuid        references public.users(id) on delete set null,
  add column last_modified_by uuid        references public.users(id) on delete set null,
  add column last_modified_at timestamptz,

  -- updated_at (trigger set_updated_at)
  add column updated_at     timestamptz   not null default now();

-- Backfill project_id depuis lots pour les tâches existantes
-- (table vide en prod — 0 lignes — mais le script doit être idempotent)
update public.tasks t
  set project_id = l.project_id
  from public.lots l
  where t.lot_id = l.id
    and t.project_id is null;

-- project_id est maintenant NOT NULL (safe : table vide)
alter table public.tasks
  alter column project_id set not null;

-- ============================================================================
-- 3. INDEX
-- ============================================================================

drop index if exists tasks_lot_id_idx;
drop index if exists tasks_assigned_to_idx;

create index tasks_project_status_position_idx on public.tasks(project_id, status, position);
create index tasks_project_assigned_idx        on public.tasks(project_id, assigned_to);
create index tasks_project_lot_idx             on public.tasks(project_id, lot_id);
create index tasks_project_milestone_idx       on public.tasks(project_id, milestone_id);
create index tasks_archived_idx                on public.tasks(project_id, archived);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- 4a. updated_at
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 4b. Figer created_by côté serveur (pattern 019)
create or replace function public.protect_task_created_by()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    -- Forcer l'auteur réel. Escape migration/seed : auth.uid() IS NULL → garder tel quel.
    if auth.uid() is not null then
      NEW.created_by := auth.uid();
    end if;
    return NEW;
  end if;
  -- UPDATE : created_by ne peut jamais changer
  NEW.created_by := OLD.created_by;
  return NEW;
end $$;

create trigger tasks_protect_created_by
  before insert or update on public.tasks
  for each row execute function public.protect_task_created_by();

-- 4c. last_modified_by / last_modified_at
create or replace function public.set_task_last_modified()
returns trigger language plpgsql as $$
begin
  NEW.last_modified_by := auth.uid();
  NEW.last_modified_at := now();
  return NEW;
end $$;

create trigger tasks_set_last_modified
  before update on public.tasks
  for each row execute function public.set_task_last_modified();

-- 4d. Colonnes archivage autoritative (pattern 025)
create or replace function public.protect_task_archive_columns()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.archived = true then
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
    else
      NEW.archived_at := null;
      NEW.archived_by := null;
    end if;
    return NEW;
  end if;

  if NEW.archived is distinct from OLD.archived then
    if NEW.archived = true then
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
    else
      NEW.archived_at := null;
      NEW.archived_by := null;
    end if;
  else
    -- Pas de transition : figer aux valeurs précédentes (anti-spoof)
    NEW.archived_at := OLD.archived_at;
    NEW.archived_by := OLD.archived_by;
  end if;
  return NEW;
end $$;

create trigger tasks_protect_archive_columns
  before insert or update on public.tasks
  for each row execute function public.protect_task_archive_columns();

-- 4e. Activité : INSERT toujours loggué ; UPDATE sur status et assigned_to
create or replace function public.log_task_activity()
returns trigger language plpgsql as $$
declare
  action_str text;
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
    values (
      NEW.project_id,
      auth.uid(),
      'created',
      'task',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
    return NEW;
  end if;

  -- Changement de statut
  if NEW.status is distinct from OLD.status then
    case NEW.status
      when 'done'      then action_str := 'completed';
      when 'validated' then action_str := 'validated';
      when 'blocked'   then action_str := 'blocked';
      else                  action_str := 'updated';
    end case;
    insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
    values (
      NEW.project_id,
      auth.uid(),
      action_str,
      'task',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'status', NEW.status)
    );
  end if;

  -- Changement d'assignation
  if NEW.assigned_to is distinct from OLD.assigned_to then
    insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
    values (
      NEW.project_id,
      auth.uid(),
      'assigned',
      'task',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  end if;

  return NEW;
end $$;

create trigger tasks_log_activity
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();

-- ============================================================================
-- 5. RLS — Refonte complète (vision collaborative ouverte)
-- ============================================================================

-- Drop toutes les policies existantes (001 original + overrides 017)
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

-- Lecture : tout membre du projet
create policy tasks_select on public.tasks
  for select to authenticated using (
    public.is_project_member(project_id)
  );

-- Insertion : tout membre (created_by figé par trigger 4b)
create policy tasks_insert on public.tasks
  for insert to authenticated with check (
    public.is_project_member(project_id)
    and created_by = auth.uid()
  );

-- Modification : tout membre (last_modified_by géré par trigger 4c)
create policy tasks_update on public.tasks
  for update to authenticated
  using  (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- Suppression : admin seulement
create policy tasks_delete on public.tasks
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
  );

-- ============================================================================
-- 6. COMMENTAIRES — étendre entity_type pour inclure 'task'
-- ============================================================================

-- Supprimer l'ancienne contrainte (ajoutée en 009 : sans 'task')
alter table public.comments
  drop constraint comments_entity_type_check;

alter table public.comments
  add constraint comments_entity_type_check
    check (entity_type in (
      'document', 'deliverable', 'milestone', 'lot',
      'budget_line', 'producer_document', 'task'
    ));

-- Réécriture complète de log_comment_activity : ajoute le case 'task'
-- (remplace la version de migration 009 qui gérait producer_document)
create or replace function public.log_comment_activity()
returns trigger language plpgsql as $$
declare
  parent_title text;
begin
  case NEW.entity_type
    when 'document'          then select title    into parent_title from public.documents          where id = NEW.entity_id;
    when 'deliverable'       then select title    into parent_title from public.deliverables       where id = NEW.entity_id;
    when 'milestone'         then select title    into parent_title from public.milestones         where id = NEW.entity_id;
    when 'lot'               then select name     into parent_title from public.lots               where id = NEW.entity_id;
    when 'budget_line'       then select category into parent_title from public.budget_lines       where id = NEW.entity_id;
    when 'producer_document' then select title    into parent_title from public.producer_documents where id = NEW.entity_id;
    when 'task'              then select title    into parent_title from public.tasks              where id = NEW.entity_id;
    else parent_title := null;
  end case;

  insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
  values (
    NEW.project_id,
    auth.uid(),
    'commented',
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'title',   parent_title,
      'excerpt', substring(NEW.content from 1 for 80)
    )
  );

  return NEW;
end $$;

commit;
