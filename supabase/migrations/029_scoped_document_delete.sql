-- ============================================================================
-- 029_scoped_document_delete.sql
--
-- Deux changements :
--
-- A. Combler la lacune SELECT du rôle partner.
--    027 a centralisé l'écriture via is_project_writer mais a oublié les
--    policies SELECT, qui ont des listes de rôles inline. Sans ce patch,
--    partner peut écrire mais pas LIRE documents/tasks/producer_documents/
--    funding_sources/budget_lines — il était writer sur des tables
--    qu'il ne pouvait pas voir.
--
--    Tables impactées :
--      - documents (role list)
--      - tasks (role list, via lot_project_id)
--      - producer_documents (role list, gated has_producer_access)
--      - funding_sources (role list, gated has_producer_access)
--      - budget_lines (role list, gated has_producer_access, scope org pour
--        production_manager/partner)
--
-- B. Resserrer DELETE sur documents et producer_documents pour
--    production_manager / partner :
--      - admin              : delete any country (inchangé)
--      - coproducer         : delete sur son pays (inchangé)
--      - production_manager : delete sur son pays UNIQUEMENT ses propres uploads
--      - partner            : idem production_manager
--      - contractor         : pas de delete (inchangé)
--
--    Justification (brief Pierre) : le chargé.e de projet peut éditer une
--    fiche doc (titre, statut, version) sur son pays, mais pas effacer
--    une fiche uploadée par admin/producteur. Garde anti-dégât pour les
--    rôles secondaires sur des décisions irréversibles.
--
--    UPDATE reste inchangé (production_manager/partner peuvent éditer
--    n'importe quelle fiche dans leur pays). C'est asymétrique mais
--    voulu : UPDATE est incrémental, DELETE est final.
-- ============================================================================

-- A. SELECT policies — ajout 'partner' ---------------------------------------

drop policy documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated using (
    uploaded_by = auth.uid()
    or public.project_access_level(project_id)
       in ('admin', 'coproducer', 'production_manager', 'partner')
  );

drop policy tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (
    assigned_to = auth.uid()
    or public.project_access_level(public.lot_project_id(lot_id))
       in ('admin', 'coproducer', 'production_manager', 'partner')
  );

drop policy producer_documents_select on public.producer_documents;
create policy producer_documents_select on public.producer_documents
  for select to authenticated using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager', 'partner')
  );

drop policy funding_sources_select on public.funding_sources;
create policy funding_sources_select on public.funding_sources
  for select to authenticated using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager', 'partner')
  );

drop policy budget_lines_select on public.budget_lines;
create policy budget_lines_select on public.budget_lines
  for select to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) in ('admin', 'coproducer')
      or (
        public.project_access_level(project_id) in ('production_manager', 'partner')
        and org_id = public.current_user_org_id()
      )
    )
  );

-- B. DELETE policies resserrées ----------------------------------------------

-- documents : 027 utilisait is_project_writer (admin OR writer+country).
-- On le décompose pour appliquer la nuance own-uploads-only sur
-- production_manager / partner.
drop policy documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
    or (
      public.project_access_level(project_id) in ('production_manager', 'partner')
      and country = public.current_user_country()
      and uploaded_by = auth.uid()
    )
  );

-- producer_documents : même logique, avec barrière has_producer_access.
drop policy producer_documents_delete on public.producer_documents;
create policy producer_documents_delete on public.producer_documents
  for delete to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and country = public.current_user_country()
      )
      or (
        public.project_access_level(project_id) in ('production_manager', 'partner')
        and country = public.current_user_country()
        and uploaded_by = auth.uid()
      )
    )
  );
