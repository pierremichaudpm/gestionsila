-- ============================================================================
-- 030_test_account_virginie.sql
--
-- Compte de test pour Virginie (vue contractor / Prestataire). Permet de
-- vérifier l'expérience d'un prestataire externe sans toucher à son compte
-- admin (virginiejaffredo@jaxa.ca).
--
-- Rôle : contractor, has_producer_access = false (cohérent avec Aude /
-- Jérémy / Louis depuis 012). Org : Indépendante CA (même qu'Aude).
-- Mot de passe initial 12-char bcrypt-hashé. Plaintext dans
-- docs/credentials_initiales_2026-04.md (gitignored).
--
-- Note : le trigger default_producer_access (028) flippe has_producer_access
-- pour admin/coproducer uniquement. TESTEUSE VIRGE étant contractor, le
-- trigger ne fire pas — has_producer_access reste à false comme demandé.
-- ============================================================================

do $$
declare
  pw_virge text := extensions.crypt('A=DPB3VFEl@u', extensions.gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000013',
     'authenticated', 'authenticated', 'jaffredovirginie@gmail.com', pw_virge,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', '');
end $$;

insert into public.users (id, org_id, email, full_name, role, country) values
  ('33333333-0000-0000-0000-000000000013', '22222222-0000-0000-0000-000000000008',
   'jaffredovirginie@gmail.com', 'TESTEUSE VIRGE',
   'Compte de test — vue Prestataire', 'CA');

insert into public.project_members (project_id, org_id, user_id, access_level, has_producer_access) values
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000008',
   '33333333-0000-0000-0000-000000000013', 'contractor', false);
