-- ============================================================================
-- 014_users_admin_update.sql
--
-- PARTIE A (commit 2) — édition manuelle universelle.
--
-- Permet à un admin de projet de modifier les profils des autres utilisateurs.
-- Avant : seule l'auto-édition (id = auth.uid()) était permise sur public.users.
--
-- Cette policy est additive ; users_update_self reste en place. Quand un user
-- modifie son propre profil, les deux policies s'appliquent (OR logique côté
-- Postgres) — pas de conflit.
--
-- À noter : public.users.email peut être édité ici, mais l'email de connexion
-- réel vit dans auth.users (géré par Supabase Auth). Le changer dans public
-- n'affecte que l'affichage côté outil. Pour propager au login, il faudra
-- une migration SQL ou un appel RPC dédié.
-- ============================================================================

create policy users_update_admin on public.users
  for update to authenticated
  using (
    exists (
      select 1 from public.project_members
       where user_id = auth.uid() and access_level = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.project_members
       where user_id = auth.uid() and access_level = 'admin'
    )
  );
