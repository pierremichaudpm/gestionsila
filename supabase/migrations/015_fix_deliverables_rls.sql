-- ============================================================================
-- 015_fix_deliverables_rls.sql
--
-- Fix : les policies INSERT/UPDATE/DELETE de deliverables exigeaient
-- funder_country = current_user_country pour TOUS les rôles, y compris admin.
-- Conséquence : Virginie (admin, country=CA) ne pouvait modifier que les
-- livrables des bailleurs canadiens (SODEC), pas les FR ni LU. Pire encore,
-- l'UPDATE ne renvoyait pas d'erreur — RLS filtre la ligne, 0 row affected,
-- silencieux côté UI.
--
-- Correction (alignée sur le modèle des funders et des budget_lines) :
--   - admin              : écriture sur tous les pays
--   - coproducer         : écriture sur son pays uniquement
--   - production_manager : lecture seule (retiré du write — le spec précise
--     "production_manager lecture seule" alors qu'avant il pouvait écrire
--     sur son pays)
--   - contractor         : pas de droits (déjà le cas)
--
-- Note : revoir si William (production_manager FR) doit conserver des droits
-- d'écriture sur les livrables Dark Euphoria — pour l'instant on retire
-- conformément à la directive Virginie.
-- ============================================================================

drop policy deliverables_insert on public.deliverables;
drop policy deliverables_update on public.deliverables;
drop policy deliverables_delete on public.deliverables;

create policy deliverables_insert on public.deliverables
  for insert to authenticated with check (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) = 'coproducer'
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );

create policy deliverables_update on public.deliverables
  for update to authenticated
  using (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) = 'coproducer'
      and public.funder_country(funder_id) = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) = 'coproducer'
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );

create policy deliverables_delete on public.deliverables
  for delete to authenticated using (
    public.project_access_level(public.funder_project_id(funder_id)) = 'admin'
    or (
      public.project_access_level(public.funder_project_id(funder_id)) = 'coproducer'
      and public.funder_country(funder_id) = public.current_user_country()
    )
  );
