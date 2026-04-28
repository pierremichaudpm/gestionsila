-- ============================================================================
-- 017_rls_uniform_scope.sql
--
-- Audit complet des policies RLS d'écriture pour aligner sur la règle
-- générale du projet :
--
--    "Tout le monde lit tout. L'écriture est filtrée par pays sauf
--     pour l'admin (qui écrit sur tous les pays). Le production_manager
--     est dans le périmètre des rôles qui écrivent sur leur pays."
--
-- Deux bugs systémiques corrigés ici :
--
-- BUG 1 — admin sans escape (le AND country = current_user_country
-- s'appliquait aussi à l'admin). Touchait : lots, tasks, documents,
-- producer_documents.
--
-- BUG 2 — production_manager exclu des rôles écrivants. Touchait :
-- deliverables (déjà partiellement corrigé en 015), funders, milestones.
--
-- Tables qui restent inchangées (production_manager volontairement
-- read-only) : budget_lines, funding_sources (gated par
-- has_producer_access — espace producteurs).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- lots — fix admin escape
-- ----------------------------------------------------------------------------
drop policy lots_insert on public.lots;
drop policy lots_update on public.lots;
drop policy lots_delete on public.lots;

create policy lots_insert on public.lots
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy lots_update on public.lots
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy lots_delete on public.lots
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

-- ----------------------------------------------------------------------------
-- tasks — fix admin escape (lot_country reste pour les rôles non admin)
-- ----------------------------------------------------------------------------
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;
drop policy tasks_delete on public.tasks;

create policy tasks_insert on public.tasks
  for insert to authenticated with check (
    public.project_access_level(public.lot_project_id(lot_id)) = 'admin'
    or (
      public.project_access_level(public.lot_project_id(lot_id)) in ('coproducer', 'production_manager')
      and public.lot_country(lot_id) = public.current_user_country()
    )
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.project_access_level(public.lot_project_id(lot_id)) = 'admin'
    or (
      public.project_access_level(public.lot_project_id(lot_id)) in ('coproducer', 'production_manager')
      and public.lot_country(lot_id) = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(public.lot_project_id(lot_id)) = 'admin'
    or (
      public.project_access_level(public.lot_project_id(lot_id)) in ('coproducer', 'production_manager')
      and public.lot_country(lot_id) = public.current_user_country()
    )
  );

create policy tasks_delete on public.tasks
  for delete to authenticated using (
    public.project_access_level(public.lot_project_id(lot_id)) = 'admin'
    or (
      public.project_access_level(public.lot_project_id(lot_id)) in ('coproducer', 'production_manager')
      and public.lot_country(lot_id) = public.current_user_country()
    )
  );

-- ----------------------------------------------------------------------------
-- documents — fix admin escape (uploaded_by = auth.uid() préservé pour INSERT)
-- ----------------------------------------------------------------------------
drop policy documents_insert on public.documents;
drop policy documents_update on public.documents;
drop policy documents_delete on public.documents;

create policy documents_insert on public.documents
  for insert to authenticated with check (
    (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) in ('coproducer', 'production_manager')
        and country = public.current_user_country()
      )
    )
    and uploaded_by = auth.uid()
  );

create policy documents_update on public.documents
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy documents_delete on public.documents
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

-- ----------------------------------------------------------------------------
-- producer_documents — fix admin escape (has_producer_access barrier reste)
-- ----------------------------------------------------------------------------
drop policy producer_documents_insert on public.producer_documents;
drop policy producer_documents_update on public.producer_documents;
drop policy producer_documents_delete on public.producer_documents;

create policy producer_documents_insert on public.producer_documents
  for insert to authenticated with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) in ('coproducer', 'production_manager')
        and country = public.current_user_country()
      )
    )
    and uploaded_by = auth.uid()
  );

create policy producer_documents_update on public.producer_documents
  for update to authenticated
  using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) in ('coproducer', 'production_manager')
        and country = public.current_user_country()
      )
    )
  )
  with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) in ('coproducer', 'production_manager')
        and country = public.current_user_country()
      )
    )
  );

create policy producer_documents_delete on public.producer_documents
  for delete to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) in ('coproducer', 'production_manager')
        and country = public.current_user_country()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- funders — ajoute production_manager (country match)
-- ----------------------------------------------------------------------------
drop policy funders_insert on public.funders;
drop policy funders_update on public.funders;
drop policy funders_delete on public.funders;

create policy funders_insert on public.funders
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy funders_update on public.funders
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy funders_delete on public.funders
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

-- ----------------------------------------------------------------------------
-- milestones — ajoute production_manager (country match)
-- ----------------------------------------------------------------------------
drop policy milestones_insert on public.milestones;
drop policy milestones_update on public.milestones;
drop policy milestones_delete on public.milestones;

create policy milestones_insert on public.milestones
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy milestones_update on public.milestones
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

create policy milestones_delete on public.milestones
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and country = public.current_user_country()
    )
  );

-- ----------------------------------------------------------------------------
-- deliverables — réintègre production_manager (country match) après 015
-- ----------------------------------------------------------------------------
drop policy deliverables_insert on public.deliverables;
drop policy deliverables_update on public.deliverables;
drop policy deliverables_delete on public.deliverables;

create policy deliverables_insert on public.deliverables
  for insert to authenticated with check (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) in ('coproducer', 'production_manager')
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );

create policy deliverables_update on public.deliverables
  for update to authenticated
  using (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) in ('coproducer', 'production_manager')
      and public.funder_country(funder_id) = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) in ('coproducer', 'production_manager')
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );

create policy deliverables_delete on public.deliverables
  for delete to authenticated using (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) in ('coproducer', 'production_manager')
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );
