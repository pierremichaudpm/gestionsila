-- ============================================================================
-- 027_partner_role.sql
--
-- Nouveau rôle 'partner' avec mêmes droits qu'un production_manager :
-- CRUD scopé par pays sur lots/tasks/documents/producer_documents/funders/
-- milestones/deliverables. Pas d'accès Espace Producteurs par défaut.
--
-- Centralisation : la logique writer "admin escape OU (rôle writer + pays
-- match)" est dupliquée 21 fois dans les policies depuis 017. On la
-- factorise dans is_project_writer(_project_id, _country). Ajouter un
-- futur rôle = éditer la fonction, pas réécrire 21 policies.
--
-- Hors scope (production_manager y est intentionnellement exclu, donc
-- partner aussi par symétrie) :
--   - budget_lines (009) : admin + coproducer (org match) seulement
--   - funding_sources (010) : admin + coproducer (country match) seulement
--   - project_settings (002), users (014) : admin only
-- ============================================================================

-- 1. CHECK constraint étendu --------------------------------------------------
alter table public.project_members
  drop constraint project_members_access_level_check;

alter table public.project_members
  add constraint project_members_access_level_check
  check (access_level in ('admin', 'coproducer', 'production_manager', 'partner', 'contractor'));

-- 2. Helper centralisant la logique writer ------------------------------------
-- TRUE si l'utilisateur courant peut écrire sur une entité du projet :
--   - admin sur n'importe quel pays
--   - coproducer / production_manager / partner sur leur propre pays
create or replace function public.is_project_writer(_project_id uuid, _country text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.project_access_level(_project_id) = 'admin'
    or (
      public.project_access_level(_project_id) in ('coproducer', 'production_manager', 'partner')
      and _country = public.current_user_country()
    )
$$;

-- 3. Migration des 21 policies country-scoped writer (issue de 017) ----------
-- Pattern uniforme : chaque action devient un appel au helper.

-- lots ........................................................................
drop policy lots_insert on public.lots;
drop policy lots_update on public.lots;
drop policy lots_delete on public.lots;

create policy lots_insert on public.lots
  for insert to authenticated
  with check (public.is_project_writer(project_id, country));

create policy lots_update on public.lots
  for update to authenticated
  using (public.is_project_writer(project_id, country))
  with check (public.is_project_writer(project_id, country));

create policy lots_delete on public.lots
  for delete to authenticated
  using (public.is_project_writer(project_id, country));

-- tasks (country dérivé du lot parent) .........................................
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;
drop policy tasks_delete on public.tasks;

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_project_writer(public.lot_project_id(lot_id), public.lot_country(lot_id)));

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_project_writer(public.lot_project_id(lot_id), public.lot_country(lot_id)))
  with check (public.is_project_writer(public.lot_project_id(lot_id), public.lot_country(lot_id)));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_project_writer(public.lot_project_id(lot_id), public.lot_country(lot_id)));

-- documents (uploaded_by = auth.uid() préservé sur INSERT, cf. 017+019) .......
drop policy documents_insert on public.documents;
drop policy documents_update on public.documents;
drop policy documents_delete on public.documents;

create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    public.is_project_writer(project_id, country)
    and uploaded_by = auth.uid()
  );

create policy documents_update on public.documents
  for update to authenticated
  using (public.is_project_writer(project_id, country))
  with check (public.is_project_writer(project_id, country));

create policy documents_delete on public.documents
  for delete to authenticated
  using (public.is_project_writer(project_id, country));

-- producer_documents (has_producer_access barrière + uploaded_by INSERT) ......
drop policy producer_documents_insert on public.producer_documents;
drop policy producer_documents_update on public.producer_documents;
drop policy producer_documents_delete on public.producer_documents;

create policy producer_documents_insert on public.producer_documents
  for insert to authenticated
  with check (
    public.has_producer_access(project_id)
    and public.is_project_writer(project_id, country)
    and uploaded_by = auth.uid()
  );

create policy producer_documents_update on public.producer_documents
  for update to authenticated
  using (
    public.has_producer_access(project_id)
    and public.is_project_writer(project_id, country)
  )
  with check (
    public.has_producer_access(project_id)
    and public.is_project_writer(project_id, country)
  );

create policy producer_documents_delete on public.producer_documents
  for delete to authenticated
  using (
    public.has_producer_access(project_id)
    and public.is_project_writer(project_id, country)
  );

-- funders ......................................................................
drop policy funders_insert on public.funders;
drop policy funders_update on public.funders;
drop policy funders_delete on public.funders;

create policy funders_insert on public.funders
  for insert to authenticated
  with check (public.is_project_writer(project_id, country));

create policy funders_update on public.funders
  for update to authenticated
  using (public.is_project_writer(project_id, country))
  with check (public.is_project_writer(project_id, country));

create policy funders_delete on public.funders
  for delete to authenticated
  using (public.is_project_writer(project_id, country));

-- milestones ...................................................................
drop policy milestones_insert on public.milestones;
drop policy milestones_update on public.milestones;
drop policy milestones_delete on public.milestones;

create policy milestones_insert on public.milestones
  for insert to authenticated
  with check (public.is_project_writer(project_id, country));

create policy milestones_update on public.milestones
  for update to authenticated
  using (public.is_project_writer(project_id, country))
  with check (public.is_project_writer(project_id, country));

create policy milestones_delete on public.milestones
  for delete to authenticated
  using (public.is_project_writer(project_id, country));

-- deliverables (country dérivé du funder parent) ...............................
drop policy deliverables_insert on public.deliverables;
drop policy deliverables_update on public.deliverables;
drop policy deliverables_delete on public.deliverables;

create policy deliverables_insert on public.deliverables
  for insert to authenticated
  with check (public.is_project_writer(public.funder_project_id(funder_id), public.funder_country(funder_id)));

create policy deliverables_update on public.deliverables
  for update to authenticated
  using (public.is_project_writer(public.funder_project_id(funder_id), public.funder_country(funder_id)))
  with check (public.is_project_writer(public.funder_project_id(funder_id), public.funder_country(funder_id)));

create policy deliverables_delete on public.deliverables
  for delete to authenticated
  using (public.is_project_writer(public.funder_project_id(funder_id), public.funder_country(funder_id)));

-- 4. comments_insert : ajout de 'partner' ------------------------------------
-- Pattern différent (rôle seulement, pas de country — un commentaire n'a pas
-- de pays propre, il suit l'entité commentée). Le helper exigeant une country,
-- on garde le check inline et on ajoute 'partner' à la liste.
drop policy comments_insert on public.comments;

create policy comments_insert on public.comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_project_member(project_id)
    and (
      public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager', 'partner')
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
