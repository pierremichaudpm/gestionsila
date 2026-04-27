-- ============================================================================
-- SILA — seed dev local
--
-- ⚠ DEV ONLY. Ce fichier crée 9 entrées dans auth.users avec le mot de passe
-- partagé « SilaDev2026! » (bcrypt). Ne jamais exécuter contre une base prod.
-- Les emails sont des placeholders — à remplacer par les vrais avant mise en
-- prod, via invitation Supabase Auth qui créera auth.users + public.users.
--
-- UUID conventions (lisibles dans les requêtes) :
--   11... project SILA
--   22... organizations
--   33... users
--   44... lots
--   55... funders
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Project
-- ----------------------------------------------------------------------------
insert into public.projects (id, name, description, status) values
  ('11111111-1111-1111-1111-111111111111',
   'SILA — Héroïnes Arctiques',
   'Coproduction internationale VR 25 min (QC/FR/LU). Ref : SM-2026-SILA.',
   'active');

-- ----------------------------------------------------------------------------
-- Organizations
-- ----------------------------------------------------------------------------
insert into public.organizations (id, name, country, currency, role) values
  ('22222222-0000-0000-0000-000000000001', 'JAXA Production inc.',   'CA', 'CAD', 'producer'),
  ('22222222-0000-0000-0000-000000000002', 'Dark Euphoria',          'FR', 'EUR', 'coproducer'),
  ('22222222-0000-0000-0000-000000000003', 'Poulpe Bleu Production', 'LU', 'EUR', 'coproducer'),
  ('22222222-0000-0000-0000-000000000004', 'Voulez-Vous Studio',     'FR', 'EUR', 'contractor'),
  ('22222222-0000-0000-0000-000000000005', 'Diversion Cinema',       'FR', 'EUR', 'distributor'),
  ('22222222-0000-0000-0000-000000000006', 'Freelance',              'FR', 'EUR', 'contractor');

-- ----------------------------------------------------------------------------
-- Auth users (dev, mot de passe partagé bcrypt)
-- ----------------------------------------------------------------------------
do $$
declare
  pw text := crypt('SilaDev2026!', gen_salt('bf'));
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000001',
     'authenticated', 'authenticated', 'virginiejaffredo@jaxa.ca', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000002',
     'authenticated', 'authenticated', 'axelle@jaxaproduction.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003',
     'authenticated', 'authenticated', 'mathieu@dark-euphoria.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000004',
     'authenticated', 'authenticated', 'marie@dark-euphoria.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000005',
     'authenticated', 'authenticated', 'william@dark-euphoria.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000006',
     'authenticated', 'authenticated', 'helene@poulpebleu.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000007',
     'authenticated', 'authenticated', 'anne-lise@poulpebleu.com', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000008',
     'authenticated', 'authenticated', 'raphael@voulez-vous.studio', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000009',
     'authenticated', 'authenticated', 'antoine@freelance.example', pw,
     now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     now(), now(), '', '', '', '');
end $$;

-- ----------------------------------------------------------------------------
-- Public users (mêmes UUIDs que auth.users)
-- ----------------------------------------------------------------------------
insert into public.users (id, org_id, email, full_name, role, country) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'virginiejaffredo@jaxa.ca', 'Virginie Jaffredo',   'Productrice',             'CA'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001',
   'axelle@jaxaproduction.com',   'Axelle Michaud',      'Coordinatrice',           'CA'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002',
   'mathieu@dark-euphoria.com',   'Mathieu Rozières',    'Producteur délégué',      'FR'),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002',
   'marie@dark-euphoria.com',     'Marie Point',         'Productrice',             'FR'),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002',
   'william@dark-euphoria.com',   'William Board',       'Chargé de production',    'FR'),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003',
   'helene@poulpebleu.com',       'Hélène Walland',      'Gérante / Productrice',   'LU'),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003',
   'anne-lise@poulpebleu.com',    'Anne-Lise Miller',    'Chargée de production',   'LU'),
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000004',
   'raphael@voulez-vous.studio',  'Raphaël Chênais',     'Direction technologique', 'FR'),
  ('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000006',
   'antoine@freelance.example',   'Antoine Boucherikha', 'Conception sonore',       'FR');

-- ----------------------------------------------------------------------------
-- Project members (équipes SILA)
-- ----------------------------------------------------------------------------
insert into public.project_members (project_id, org_id, user_id, access_level) values
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'admin'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'production_manager'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003', 'coproducer'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004', 'coproducer'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000005', 'production_manager'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000006', 'coproducer'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000007', 'production_manager'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000008', 'contractor'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000009', 'contractor');

-- ----------------------------------------------------------------------------
-- Lots (5 tableaux SILA)
-- ----------------------------------------------------------------------------
insert into public.lots (id, project_id, org_id, name, director, country, status, sort_order) values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000002',
   'Le Naufrage — Mary Shelley',
   'Agnès de Cayeux',   'FR', 'prototype',     1),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000002',
   'La Presqu''île aux tombeaux — Léonie d''Aunet',
   'Mélanie Courtinat', 'FR', 'prototype',     2),
  ('44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000003',
   'La Titanide de glace — George Sand',
   'Laura Mannelli',    'LU', 'prototype',     3),
  ('44444444-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000001',
   'Les Phénomènes — Eunice Newton Foote',
   'Aude Guivarc''h',   'CA', 'in_production', 4),
  ('44444444-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000002',
   'Le Data Center — Ellen H. Rasmussen',
   'Agnès de Cayeux',   'FR', 'prototype',     5);

-- ----------------------------------------------------------------------------
-- Funders (bailleurs SILA)
-- ----------------------------------------------------------------------------
insert into public.funders (id, project_id, name, country, amount, currency, status, beneficiary_org_id) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'SODEC — Volet 2',             'CA', 115000.00, 'CAD', 'acquired',
   '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'CNC — Création Immersive',    'FR',  90000.00, 'EUR', 'acquired',
   '22222222-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'FilmFund Luxembourg — Dév.',  'LU',  45000.00, 'EUR', 'acquired',
   '22222222-0000-0000-0000-000000000003'),
  ('55555555-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'FilmFund Luxembourg — Prod.', 'LU', 167196.00, 'EUR', 'expected',
   '22222222-0000-0000-0000-000000000003'),
  ('55555555-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'Pictanovo',                   'FR',  12000.00, 'EUR', 'expected',
   '22222222-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
   'Région SUD PACA',             'FR',  33000.00, 'EUR', 'acquired',
   '22222222-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
   'Métropole Montpellier',       'FR',  15000.00, 'EUR', 'acquired',
   '22222222-0000-0000-0000-000000000002');
