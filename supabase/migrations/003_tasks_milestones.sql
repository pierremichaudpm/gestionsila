-- ============================================================================
-- 003_tasks_milestones.sql
--
-- Phase 2 — Module Calendrier (M2)
-- Ajoute la table milestones (jalons explicites par pays). La table tasks
-- existe déjà dans 001 (utilisable pour la planification fine — pas exposée
-- dans cette page Calendrier qui se concentre sur les jalons macro).
--
-- La timeline du frontend fusionne milestones + deliverables (échéances de
-- dépôt aux bailleurs, déjà stockées dans deliverables.due_date).
-- ============================================================================

create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  lot_id      uuid references public.lots(id) on delete set null,
  title       text not null,
  date        date not null,
  type        text not null check (type in ('depot_fonds', 'festival', 'premiere', 'jalon_production')),
  country     char(2) not null,
  notes       text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index milestones_project_id_idx on public.milestones(project_id);
create index milestones_date_idx       on public.milestones(date);

alter table public.milestones enable row level security;

-- SELECT : tous les membres du projet (timeline partagée)
create policy milestones_select on public.milestones
  for select to authenticated using (
    public.is_project_member(project_id)
  );

-- INSERT : admin (any country) ou coproducer (own country only)
create policy milestones_insert on public.milestones
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );

-- UPDATE : même règle que INSERT
create policy milestones_update on public.milestones
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );

-- DELETE : admin ou coproducer (own country)
create policy milestones_delete on public.milestones
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );
