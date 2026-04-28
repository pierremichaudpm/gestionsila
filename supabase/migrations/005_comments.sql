-- ============================================================================
-- 005_comments.sql
--
-- Module Commentaires contextuels (Phase 2.5)
-- Fils de discussion attachés à une entité du projet (document, deliverable,
-- milestone, lot, budget_line). Pas un chat global. Pas de mentions ni d'édition.
-- ============================================================================

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  entity_type  text not null check (entity_type in ('document', 'deliverable', 'milestone', 'lot', 'budget_line')),
  entity_id    uuid not null,
  user_id      uuid not null references public.users(id) on delete cascade,
  content      text not null check (char_length(trim(content)) > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index comments_lookup_idx on public.comments(project_id, entity_type, entity_id, created_at);
create index comments_user_id_idx on public.comments(user_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;

-- ============================================================================
-- RLS — lecture globale (membres du projet), écriture filtrée
-- ============================================================================

create policy comments_select on public.comments
  for select to authenticated using (public.is_project_member(project_id));

-- INSERT : membres non-contractor peuvent commenter sur tout.
-- Les contractors ne peuvent commenter que sur les documents qu'ils ont uploadés
-- (cohérent avec la policy documents_select : ils ne voient que leurs propres docs).
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
  );

-- UPDATE/DELETE : auteur uniquement (l'UI n'expose que la suppression, mais la
-- policy couvre les deux par cohérence — pas d'admin override volontaire).
create policy comments_update on public.comments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy comments_delete on public.comments
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================================
-- Trace dans activity_log à la création d'un commentaire
-- ============================================================================

create or replace function public.log_comment_activity()
returns trigger
language plpgsql
as $$
declare
  parent_title text;
begin
  case NEW.entity_type
    when 'document'    then select title    into parent_title from public.documents    where id = NEW.entity_id;
    when 'deliverable' then select title    into parent_title from public.deliverables where id = NEW.entity_id;
    when 'milestone'   then select title    into parent_title from public.milestones   where id = NEW.entity_id;
    when 'lot'         then select name     into parent_title from public.lots         where id = NEW.entity_id;
    when 'budget_line' then select category into parent_title from public.budget_lines where id = NEW.entity_id;
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

create trigger comments_log_activity
  after insert on public.comments
  for each row execute function public.log_comment_activity();
