-- ============================================================================
-- 002_budget_settings.sql
--
-- Phase 2 — Module Budget (M4)
-- 1. Table project_settings : taux de change EUR→CAD fixe par projet
-- 2. Ajustement RLS budget_lines : coproducteur lit tous les budgets du projet
--    (mais reste restreint à son org pour les écritures)
--
-- Convention : exchange_rate_eur_to_cad signifie "1 EUR = X CAD".
--   - CAD → EUR : montant_cad / rate
--   - EUR → CAD : montant_eur * rate
-- ============================================================================

create table public.project_settings (
  project_id               uuid primary key references public.projects(id) on delete cascade,
  exchange_rate_eur_to_cad numeric(10, 6),
  updated_at               timestamptz not null default now()
);

create trigger project_settings_set_updated_at
  before update on public.project_settings
  for each row execute function public.set_updated_at();

alter table public.project_settings enable row level security;

create policy project_settings_select on public.project_settings
  for select to authenticated using (
    public.is_project_member(project_id)
  );

create policy project_settings_insert on public.project_settings
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
  );

create policy project_settings_update on public.project_settings
  for update to authenticated
  using (public.project_access_level(project_id) = 'admin')
  with check (public.project_access_level(project_id) = 'admin');

-- ============================================================================
-- Ajustement RLS budget_lines
-- Avant : coproducer/production_manager ne voyaient que leur org.
-- Après : coproducer voit tout (pour comparer les devises). production_manager
--         reste restreint à son org. Admin voit tout. Contractor : aucun accès.
-- ============================================================================

drop policy budget_lines_select on public.budget_lines;

create policy budget_lines_select on public.budget_lines
  for select to authenticated using (
    public.project_access_level(project_id) in ('admin', 'coproducer')
    or (
      public.project_access_level(project_id) = 'production_manager'
      and org_id = public.current_user_org_id()
    )
  );
