-- ============================================================================
-- 032_team_celya.sql
--
-- Ajout de Celya Rbh comme admin du projet SILA.
--
-- Org : JAXA Production inc. (22222222-0000-0000-0000-000000000001)
-- Accès : admin — has_producer_access forcé à true par le trigger 028.
-- Mot de passe : temporaire bcrypt. Celya le changera en cliquant
--   sur l'invitation envoyée par Virginie depuis la page Équipe
--   (bouton "Envoyer l'invitation" → resetPasswordForEmail).
-- ============================================================================

do $$
declare
  pw_celya text := extensions.crypt('Tmp!SILA2026#C', extensions.gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000014',
    'authenticated', 'authenticated',
    'rbhcelya@gmail.com', pw_celya,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
end $$;

insert into public.users (id, org_id, email, full_name, role, country) values (
  '33333333-0000-0000-0000-000000000014',
  '22222222-0000-0000-0000-000000000001',   -- JAXA Production inc.
  'rbhcelya@gmail.com',
  'Celya Rbh',
  'Admin',
  'CA'
);

-- has_producer_access sera mis à true automatiquement par le trigger 028
insert into public.project_members (project_id, org_id, user_id, access_level) values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000014',
  'admin'
);
