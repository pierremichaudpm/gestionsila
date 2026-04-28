-- ============================================================================
-- 009_producer_space.sql
--
-- "Espace Producteurs" — section confidentielle accessible uniquement aux
-- personnes nommément autorisées par Virginie. Couvre :
--   - le module Budget (budget_lines)
--   - deux nouveaux dossiers documentaires confidentiels (assurances, legal)
--     stockés dans une table séparée producer_documents (isolation stricte vis-à-vis
--     de la table documents qui reste accessible à toute l'équipe projet).
--
-- Modèle d'accès :
--   - Drapeau booléen has_producer_access sur project_members (par défaut false).
--   - Toute lecture/écriture sur budget_lines, producer_documents, et toute
--     entrée d'activity_log ou commentaire référençant ces entités passe par
--     un test has_producer_access(project_id) AVANT les règles fines existantes.
--   - Les modifications du drapeau sont tracées dans producer_access_log.
--
-- Personnes autorisées initialement (5) : Virginie, Marie, William, Hélène,
-- Anne-Lise. Pierre Michaud (dev outils) et tous les autres restent à false.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- a) Drapeau d'accès sur project_members
-- ----------------------------------------------------------------------------
alter table public.project_members
  add column has_producer_access boolean not null default false;

-- ----------------------------------------------------------------------------
-- b) Helper RLS — has_producer_access(project_id)
-- ----------------------------------------------------------------------------
create or replace function public.has_producer_access(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select has_producer_access
       from public.project_members
      where project_id = p_project_id and user_id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- c) Journal des changements d'accès
-- ----------------------------------------------------------------------------
create table public.producer_access_log (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  target_user_id      uuid not null references public.users(id) on delete cascade,
  granted_by_user_id  uuid references public.users(id) on delete set null,
  action              text not null check (action in ('granted', 'revoked')),
  created_at          timestamptz not null default now()
);

create index producer_access_log_project_idx on public.producer_access_log(project_id, created_at desc);

alter table public.producer_access_log enable row level security;

create policy producer_access_log_select on public.producer_access_log
  for select to authenticated using (
    public.project_access_level(project_id) = 'admin'
  );

create policy producer_access_log_insert on public.producer_access_log
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    and granted_by_user_id = auth.uid()
  );

-- Pas d'UPDATE/DELETE : journal append-only.

-- ----------------------------------------------------------------------------
-- d) RLS budget_lines — barrière has_producer_access AVANT règles fines.
--    On remplace les 4 policies existantes (002 avait déjà élargi la lecture
--    coproducer à tout le projet — on conserve cette logique).
-- ----------------------------------------------------------------------------
drop policy budget_lines_select on public.budget_lines;
drop policy budget_lines_insert on public.budget_lines;
drop policy budget_lines_update on public.budget_lines;
drop policy budget_lines_delete on public.budget_lines;

create policy budget_lines_select on public.budget_lines
  for select to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) in ('admin', 'coproducer')
      or (
        public.project_access_level(project_id) = 'production_manager'
        and org_id = public.current_user_org_id()
      )
    )
  );

create policy budget_lines_insert on public.budget_lines
  for insert to authenticated with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and org_id = public.current_user_org_id()
      )
    )
  );

create policy budget_lines_update on public.budget_lines
  for update to authenticated
  using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and org_id = public.current_user_org_id()
      )
    )
  )
  with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and org_id = public.current_user_org_id()
      )
    )
  );

create policy budget_lines_delete on public.budget_lines
  for delete to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and org_id = public.current_user_org_id()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- e) Documents confidentiels (assurances + légal) — table dédiée
-- ----------------------------------------------------------------------------
create table public.producer_documents (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  lot_id             uuid references public.lots(id) on delete set null,
  uploaded_by        uuid not null references public.users(id) on delete restrict,
  folder             text not null check (folder in ('assurances', 'legal')),
  title              text not null,
  country            char(2) not null,
  version            int not null default 1,
  validation_status  text not null default 'draft' check (validation_status in ('draft', 'pending', 'approved', 'archived')),
  drive_url          text not null,
  drive_file_id      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index producer_documents_project_folder_idx on public.producer_documents(project_id, folder);
create index producer_documents_uploaded_by_idx   on public.producer_documents(uploaded_by);

create trigger producer_documents_set_updated_at
  before update on public.producer_documents
  for each row execute function public.set_updated_at();

alter table public.producer_documents enable row level security;

-- Tous les accès passent par has_producer_access. Au-dessus de cette barrière,
-- on applique les mêmes règles que documents (par pays pour write).
-- Les contractors n'apparaissent jamais ici (pas de bypass uploaded_by).
create policy producer_documents_select on public.producer_documents
  for select to authenticated using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
  );

create policy producer_documents_insert on public.producer_documents
  for insert to authenticated with check (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
    and uploaded_by = auth.uid()
  );

create policy producer_documents_update on public.producer_documents
  for update to authenticated
  using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  )
  with check (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

create policy producer_documents_delete on public.producer_documents
  for delete to authenticated using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

-- ----------------------------------------------------------------------------
-- f) Activity log : trigger pour producer_documents + filtre RLS sensible
-- ----------------------------------------------------------------------------
create or replace function public.log_producer_document_activity()
returns trigger
language plpgsql
as $$
declare
  action_str    text;
  metadata_json jsonb;
begin
  if TG_OP = 'INSERT' then
    action_str := 'created';
  elsif TG_OP = 'UPDATE' then
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

  metadata_json := jsonb_build_object(
    'title',  COALESCE(NEW.title,  OLD.title),
    'folder', COALESCE(NEW.folder, OLD.folder)
  );

  if auth.uid() is not null then
    insert into public.activity_log (project_id, user_id, action, entity_type, entity_id, metadata)
    values (
      COALESCE(NEW.project_id, OLD.project_id),
      auth.uid(),
      action_str,
      'producer_document',
      COALESCE(NEW.id, OLD.id),
      metadata_json
    );
  end if;

  return COALESCE(NEW, OLD);
end $$;

create trigger producer_documents_log_activity
  after insert or update on public.producer_documents
  for each row execute function public.log_producer_document_activity();

-- Filtrer les entrées sensibles dans activity_log : un user sans
-- has_producer_access ne voit pas les actions sur budget_line ni producer_document
-- (ni les commentaires sur ces entités, qui sont loggués avec leur entity_type).
drop policy activity_log_select on public.activity_log;

create policy activity_log_select on public.activity_log
  for select to authenticated using (
    public.is_project_member(project_id)
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  );

-- ----------------------------------------------------------------------------
-- g) Comments : autoriser les fils sur producer_documents + filtrer la lecture
-- ----------------------------------------------------------------------------
-- Le nom de la check constraint sur comments.entity_type est auto-généré par
-- Postgres (créée inline en 005). On la résout dynamiquement avant de la
-- recréer avec le nouveau set de valeurs.
do $$
declare
  con_name text;
begin
  select conname into con_name
    from pg_constraint
   where conrelid = 'public.comments'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%entity_type%';
  if con_name is not null then
    execute format('alter table public.comments drop constraint %I', con_name);
  end if;
end $$;

alter table public.comments
  add constraint comments_entity_type_check
  check (entity_type in ('document', 'deliverable', 'milestone', 'lot', 'budget_line', 'producer_document'));

-- SELECT : tout membre, sauf entrées sensibles si pas d'accès.
drop policy comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (
    public.is_project_member(project_id)
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  );

-- INSERT : on garde la base (auteur self, member non-contractor sauf bypass
-- contractor sur ses propres documents) et on ajoute la barrière producer_access
-- pour les entity_types sensibles.
drop policy comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_project_member(project_id)
    and (
      public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
      or (
        public.project_access_level(project_id) = 'contractor'
        and entity_type = 'document'
        and exists (
          select 1 from public.documents
          where id = entity_id and uploaded_by = auth.uid()
        )
      )
    )
    and (
      entity_type not in ('budget_line', 'producer_document')
      or public.has_producer_access(project_id)
    )
  );

-- Mise à jour du trigger log_comment_activity : résoudre le titre pour
-- producer_document aussi.
create or replace function public.log_comment_activity()
returns trigger
language plpgsql
as $$
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

-- ----------------------------------------------------------------------------
-- h) Initialisation des 5 personnes autorisées (existing prod rows)
-- ----------------------------------------------------------------------------
update public.project_members pm
   set has_producer_access = true
  from public.users u
 where pm.user_id = u.id
   and u.email in (
     'virginiejaffredo@jaxa.ca',
     'marie@dark-euphoria.com',
     'helene@poulpebleu.com',
     'william@dark-euphoria.com',
     'anne-lise@poulpebleu.com'
   );
