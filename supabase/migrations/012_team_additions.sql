-- ============================================================================
-- 012_team_additions.sql
--
-- a) Correction des emails de 4 utilisateurs déjà créés (les valeurs
--    placeholders du seed initial sont remplacées par les vrais emails
--    fournis par Virginie le 2026-04-28).
-- b) Création de 2 nouvelles organisations canadiennes :
--      - Neek Studio (prestataire technique CA, CAD)
--      - Indépendante (artistes individuels CA, CAD ; distincte du Freelance
--        français qui hébergeait Antoine en EUR)
-- c) Création de 3 nouveaux contributeurs au projet SILA, tous en
--    contractor / has_producer_access = false :
--      - Aude Guivarc'h (Indépendante)
--      - Jérémy Roy   (Neek Studio)
--      - Louis TB     (Neek Studio)
--    Mots de passe initiaux générés aléatoirement (12 chars). Stockés
--    bcrypt natif via crypt(password, gen_salt('bf')) — l'extension pgcrypto
--    est déjà active depuis 001_schema.sql. Les valeurs en clair vivent dans
--    docs/credentials_initiales_2026-04.md (gitignored).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- a) Mise à jour des emails (Marie et Raphaël gardent leur email actuel)
-- ----------------------------------------------------------------------------
update auth.users   set email = 'mrozieres@dark-euphoria.com'  where id = '33333333-0000-0000-0000-000000000003';
update auth.users   set email = 'wboard@dark-euphoria.com'     where id = '33333333-0000-0000-0000-000000000005';
update auth.users   set email = 'helenewalland@gmail.com'      where id = '33333333-0000-0000-0000-000000000006';
update auth.users   set email = 'millerannelise@gmail.com'     where id = '33333333-0000-0000-0000-000000000007';

update public.users set email = 'mrozieres@dark-euphoria.com'  where id = '33333333-0000-0000-0000-000000000003';
update public.users set email = 'wboard@dark-euphoria.com'     where id = '33333333-0000-0000-0000-000000000005';
update public.users set email = 'helenewalland@gmail.com'      where id = '33333333-0000-0000-0000-000000000006';
update public.users set email = 'millerannelise@gmail.com'     where id = '33333333-0000-0000-0000-000000000007';

-- ----------------------------------------------------------------------------
-- b) Nouvelles organisations
-- ----------------------------------------------------------------------------
insert into public.organizations (id, name, country, currency, role) values
  ('22222222-0000-0000-0000-000000000007', 'Neek Studio',  'CA', 'CAD', 'contractor'),
  ('22222222-0000-0000-0000-000000000008', 'Indépendante', 'CA', 'CAD', 'contractor');

-- ----------------------------------------------------------------------------
-- c) auth.users : 3 nouveaux comptes avec mot de passe bcrypt unique.
-- Wrappé dans un do $$ block pour que crypt/gen_salt soient résolus dans
-- le bon search_path (cf. pattern utilisé dans seed.sql).
-- ----------------------------------------------------------------------------
do $$
declare
  pw_aude   text := extensions.crypt('qc*NICcC7UmL', extensions.gen_salt('bf'));
  pw_jeremy text := extensions.crypt('EvI0vMa+%@Wl', extensions.gen_salt('bf'));
  pw_louis  text := extensions.crypt('sRJ8yw=yq*$a', extensions.gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000010',
     'authenticated', 'authenticated', 'aude@guivar.ch', pw_aude,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000011',
     'authenticated', 'authenticated', 'jeremy@neek.studio', pw_jeremy,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000012',
     'authenticated', 'authenticated', 'louis@neek.studio', pw_louis,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', '');
end $$;

-- ----------------------------------------------------------------------------
-- public.users : profils
-- ----------------------------------------------------------------------------
insert into public.users (id, org_id, email, full_name, role, country) values
  ('33333333-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000008',
   'aude@guivar.ch',     'Aude Guivarc''h', 'Artiste — création univers visuel',                'CA'),
  ('33333333-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000007',
   'jeremy@neek.studio', 'Jérémy Roy',      'Prestataire technique — interactions VR Tab. IV',  'CA'),
  ('33333333-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000007',
   'louis@neek.studio',  'Louis TB',        'Prestataire technique — interactions VR Tab. IV',  'CA');

-- ----------------------------------------------------------------------------
-- project_members : tous contractor, sans accès Espace Producteurs
-- ----------------------------------------------------------------------------
insert into public.project_members (project_id, org_id, user_id, access_level, has_producer_access) values
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000008',
   '33333333-0000-0000-0000-000000000010', 'contractor', false), -- Aude
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000007',
   '33333333-0000-0000-0000-000000000011', 'contractor', false), -- Jérémy
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000007',
   '33333333-0000-0000-0000-000000000012', 'contractor', false); -- Louis
