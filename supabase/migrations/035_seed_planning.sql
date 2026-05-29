-- 035_seed_planning.sql
--
-- Seed idempotent du planning de production SILA (76 tâches + périodes + jalons
-- manquants) dans le modèle existant (lots / tasks / task_periods / milestones).
-- Dépend de 034 (task_periods, tasks.responsable_label, lots.country nullable,
-- index unique external_id). À LANCER APRÈS 034 dans le SQL Editor.
--
-- CONTENU : Tableaux I..V + DEV + PROMO (76 tâches + ≈108 périodes) + 6 jalons.
--
-- DÉCISIONS VIRGINIE (2026-05-30) intégrées :
--   D2 — DEV et PROMOTION = TRANSVERSAL → lots.country = NULL (cf. 034).
--   D9 — rectangle violet T-V « Push build EN » sep→déc 2025 : « pas besoin de
--        l'avoir » → période RETIRÉE.
--   Mostra de Venise (2–12 sept) = événement public, distinct de la livraison
--        Venise Immersive (24/08, déjà en 007) → jalon séparé.
--
-- CONVENTION S1–S4 → DATES (décision D1) :
--   S1=01–07 · S2=08–14 · S3=15–21 · S4=22→fin du mois. Semaines contiguës
--   (y compris multi-mois) → une seule période. Séparateur « · » = NON contigu
--   → plusieurs lignes task_periods. Annotation datée d'une cellule → note de
--   la période. « à confirmer » → is_tentative=true. Quand une annotation
--   donne une date exacte (« du 21 avril », « au 31 mai »), elle prime sur la
--   borne S (cf. résidence sound design).
--
-- RESPONSABLES (D4) : seul Antoine Boucherikha a un compte
--   (33333333-0000-0000-0000-000000000009 → assigned_to). Les autres →
--   responsable_label texte. Tâche à responsable multiple → label combiné,
--   assigned_to NULL.
--
-- STATUTS (D3) : enum tasks existant. Tout en 'todo' (= planifié). Le « à
--   confirmer » est porté par task_periods.is_tentative.
--
-- IDEMPOTENCE : lots/tasks upsert sur UUID déterministe (ON CONFLICT (id) DO
--   UPDATE) ; task_periods supprimées puis réinsérées (section B) ; milestones
--   ON CONFLICT (id) DO NOTHING.
--
-- UUID : tâches 66666666-000S-0000-0000-0000000000NN (S = section : 1..5,
--   6=DEV, 7=PROMO ; NN = index tâche). Jalons 6d000000-…

begin;

-- ============================================================================
-- A. LOTS DEV / PROMO  (les 5 Tableaux existent déjà : 44444444-…-001..005)
-- ============================================================================
-- D2 résolu (Virginie 2026-05-30) : DEV et PROMO = TRANSVERSAL → country=NULL
--   (nécessite 034 qui rend lots.country nullable). status='in_production'
--   (valeur neutre). org_id : DEV → Voulez-Vous Studio (…-004),
--   PROMO → Dark Euphoria (…-002) — org responsable, sans incidence sur le pays.
insert into public.lots (id, project_id, org_id, name, director, country, status, sort_order) values
  ('44444444-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000004', 'Dev transversal', null, null, 'in_production', 6),
  ('44444444-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000002', 'Promotion',       null, null, 'in_production', 7)
on conflict (id) do update set
  name = excluded.name, org_id = excluded.org_id, country = excluded.country,
  status = excluded.status, sort_order = excluded.sort_order;

-- ============================================================================
-- B. PURGE des périodes des tâches seedées (idempotence task_periods)
-- ============================================================================
delete from public.task_periods
  where task_id in (
    select id from public.tasks
    where project_id = '11111111-1111-1111-1111-111111111111'
      and (external_id like 'T1-%' or external_id like 'T2-%' or external_id like 'T3-%'
        or external_id like 'T4-%' or external_id like 'T5-%'
        or external_id like 'DEV-%' or external_id like 'PROMO-%')
  );

-- ============================================================================
-- C. TABLEAU I — LE NAUFRAGE   (lot …-001, FR)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-prototype',       'Prototype',          'todo', 'p2', 'FR', null, 'Odran Jobin',    1),
  ('66666666-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-traduction',      'Traduction',         'todo', 'p2', 'FR', null, 'Ismael Backes',  2),
  ('66666666-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-sound-design',    'Sound design',       'todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 3),
  ('66666666-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-ecriture-textes', 'Écriture textes',    'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 4),
  ('66666666-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-voix-fr-crea',    'Création Voix FR',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 5),
  ('66666666-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-voix-fr-integ',   'Intégration Voix FR','todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 6),
  ('66666666-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-voix-en-crea',    'Création Voix EN',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 7),
  ('66666666-0001-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-voix-en-integ',   'Intégration Voix EN','todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 8),
  ('66666666-0001-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-transition',      'Transition',         'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 9),
  ('66666666-0001-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-polish',          'Polish',             'todo', 'p2', 'FR', null, 'Odran Jobin',    10),
  ('66666666-0001-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-game-design',     'Game design',        'todo', 'p2', 'FR', null, 'Voulez-vous',    11),
  ('66666666-0001-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-optimisation',    'Optimisation',       'todo', 'p2', 'FR', null, 'Voulez-vous',    12),
  ('66666666-0001-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-integ-finale',    'Intégration finale', 'todo', 'p2', 'FR', null, 'Voulez-vous',    13),
  ('66666666-0001-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-push-fr',         'Push build FR',      'todo', 'p2', 'FR', null, 'Voulez-vous',    14),
  ('66666666-0001-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', 'T1-push-en',         'Push build EN',      'todo', 'p2', 'FR', null, 'Voulez-vous',    15)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  ('66666666-0001-0000-0000-000000000001', '2025-09-01', '2025-09-14', false, null),
  ('66666666-0001-0000-0000-000000000002', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0001-0000-0000-000000000003', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0001-0000-0000-000000000004', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0001-0000-0000-000000000004', '2026-04-15', '2026-04-21', false, 'cut texte'),
  ('66666666-0001-0000-0000-000000000005', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0001-0000-0000-000000000006', '2026-01-01', '2026-01-14', false, null),
  ('66666666-0001-0000-0000-000000000006', '2026-05-01', '2026-05-07', false, 'rework avec texte cuté'),
  ('66666666-0001-0000-0000-000000000007', '2026-02-22', '2026-02-28', false, null),
  ('66666666-0001-0000-0000-000000000008', '2026-02-22', '2026-02-28', false, null),
  ('66666666-0001-0000-0000-000000000008', '2026-05-01', '2026-05-07', false, 'rework avec texte cuté'),
  ('66666666-0001-0000-0000-000000000009', '2026-01-01', '2026-01-14', false, null),
  ('66666666-0001-0000-0000-000000000010', '2026-04-22', '2026-04-30', false, '27–30 avril'),
  ('66666666-0001-0000-0000-000000000011', '2026-04-08', '2026-04-21', false, null),
  ('66666666-0001-0000-0000-000000000012', '2026-04-08', '2026-04-21', false, null),
  ('66666666-0001-0000-0000-000000000013', '2026-04-08', '2026-04-30', false, null),
  ('66666666-0001-0000-0000-000000000014', '2026-01-22', '2026-01-31', false, 'proto'),
  ('66666666-0001-0000-0000-000000000014', '2026-05-01', '2026-05-14', false, 'attente push finale'),
  ('66666666-0001-0000-0000-000000000015', '2026-02-22', '2026-02-28', false, null),
  ('66666666-0001-0000-0000-000000000015', '2026-03-01', '2026-03-07', false, null),
  ('66666666-0001-0000-0000-000000000015', '2026-05-01', '2026-05-14', false, 'attente push finale');

-- ============================================================================
-- D. TABLEAU II — LA PRESQU'ÎLE AUX TOMBEAUX   (lot …-002, FR)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0002-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-prototype',       'Prototype',          'todo', 'p2', 'FR', null, 'Voulez-vous',    1),
  ('66666666-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-traduction',      'Traduction',         'todo', 'p2', 'FR', null, 'Ismael Backes',  2),
  ('66666666-0002-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-sound-design',    'Sound design',       'todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 3),
  ('66666666-0002-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-voix-fr-crea',    'Création Voix FR',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 4),
  ('66666666-0002-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-voix-fr-integ',   'Intégration Voix FR','todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 5),
  ('66666666-0002-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-voix-en-crea',    'Création Voix EN',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 6),
  ('66666666-0002-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-voix-en-integ',   'Intégration Voix EN','todo', 'p2', 'FR', null, 'Voulez-vous',    7),
  ('66666666-0002-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-game-design',     'Game design',        'todo', 'p2', 'FR', null, 'Voulez-vous, Antoine Boucherikha', 8),
  ('66666666-0002-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-polish',          'Polish',             'todo', 'p2', 'FR', null, 'Odran Jobin',    9),
  ('66666666-0002-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-optimisation',    'Optimisation',       'todo', 'p2', 'FR', null, 'Voulez-vous',   10),
  ('66666666-0002-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-push-fr',         'Push build FR',      'todo', 'p2', 'FR', null, 'Voulez-vous',   11),
  ('66666666-0002-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', 'T2-push-en',         'Push build EN',      'todo', 'p2', 'FR', null, 'Voulez-vous',   12)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  -- Prototype : Oct 2025 S1-S4 · Mar 2026 S2
  ('66666666-0002-0000-0000-000000000001', '2025-10-01', '2025-10-31', false, null),
  ('66666666-0002-0000-0000-000000000001', '2026-03-08', '2026-03-14', false, null),
  -- Traduction : Déc 2025 S1-S4 · Mar 2026 S2
  ('66666666-0002-0000-0000-000000000002', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0002-0000-0000-000000000002', '2026-03-08', '2026-03-14', false, null),
  -- Sound design : Oct 2025 S1-S4 · Mar 2026 S2 · Avr 2026 S3 (head tracking 23/04)
  ('66666666-0002-0000-0000-000000000003', '2025-10-01', '2025-10-31', false, null),
  ('66666666-0002-0000-0000-000000000003', '2026-03-08', '2026-03-14', false, null),
  ('66666666-0002-0000-0000-000000000003', '2026-04-15', '2026-04-21', false, 'head tracking 23/04'),
  -- Création Voix FR : Jan 2026 S2-S4 · Mar 2026 S2
  ('66666666-0002-0000-0000-000000000004', '2026-01-08', '2026-01-31', false, null),
  ('66666666-0002-0000-0000-000000000004', '2026-03-08', '2026-03-14', false, null),
  -- Intégration Voix FR : Jan 2026 S2-S4 · Mar 2026 S2 (SHOWCASE SXSW)
  ('66666666-0002-0000-0000-000000000005', '2026-01-08', '2026-01-31', false, null),
  ('66666666-0002-0000-0000-000000000005', '2026-03-08', '2026-03-14', false, 'SHOWCASE SXSW'),
  -- Création Voix EN : Fév 2026 S3-S4 · Mar 2026 S2
  ('66666666-0002-0000-0000-000000000006', '2026-02-15', '2026-02-28', false, null),
  ('66666666-0002-0000-0000-000000000006', '2026-03-08', '2026-03-14', false, null),
  -- Intégration Voix EN : Fév 2026 S4 · Mar 2026 S1-S2
  ('66666666-0002-0000-0000-000000000007', '2026-02-22', '2026-02-28', false, null),
  ('66666666-0002-0000-0000-000000000007', '2026-03-01', '2026-03-14', false, null),
  -- Game design : Fév 2026 S4 · Mar 2026 S1-S2 · Mar 2026 S4 (20/03)
  ('66666666-0002-0000-0000-000000000008', '2026-02-22', '2026-02-28', false, null),
  ('66666666-0002-0000-0000-000000000008', '2026-03-01', '2026-03-14', false, null),
  ('66666666-0002-0000-0000-000000000008', '2026-03-22', '2026-03-31', false, '20/03'),
  -- Polish : Mar 2026 S2 · Mar 2026 S4 (6-10 avril)
  ('66666666-0002-0000-0000-000000000009', '2026-03-08', '2026-03-14', false, null),
  ('66666666-0002-0000-0000-000000000009', '2026-03-22', '2026-03-31', false, '6–10 avril'),
  -- Optimisation : Mar 2026 S2 · Mar 2026 S4 · Avr 2026 S2
  ('66666666-0002-0000-0000-000000000010', '2026-03-08', '2026-03-14', false, null),
  ('66666666-0002-0000-0000-000000000010', '2026-03-22', '2026-03-31', false, null),
  ('66666666-0002-0000-0000-000000000010', '2026-04-08', '2026-04-14', false, null),
  -- Push build FR : Fév S1-S2 (proto) · Mar S2 · Avr S2 (.apk) · Mai S2 (head tracking)
  ('66666666-0002-0000-0000-000000000011', '2026-02-01', '2026-02-14', false, 'proto'),
  ('66666666-0002-0000-0000-000000000011', '2026-03-08', '2026-03-14', false, null),
  ('66666666-0002-0000-0000-000000000011', '2026-04-08', '2026-04-14', false, '2026-04-10_1_Odran_Polish.apk'),
  ('66666666-0002-0000-0000-000000000011', '2026-05-08', '2026-05-14', false, 'attente push w/ head tracking'),
  -- Push build EN : Mar S1-S2 (proto) · Avr S2 (.apk) · Mai S2 (head tracking)
  ('66666666-0002-0000-0000-000000000012', '2026-03-01', '2026-03-14', false, 'proto'),
  ('66666666-0002-0000-0000-000000000012', '2026-04-08', '2026-04-14', false, '2026-04-10_1_Odran_Polish.apk'),
  ('66666666-0002-0000-0000-000000000012', '2026-05-08', '2026-05-14', false, 'attente push w/ head tracking');

-- ============================================================================
-- E. TABLEAU III — LA TITANIDE DE GLACE   (lot …-003, LU)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0003-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-prototype',       'Prototype',          'todo', 'p2', 'LU', null, 'Fireflies Studio', 1),
  ('66666666-0003-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-traduction',      'Traduction',         'todo', 'p2', 'LU', null, 'Ismael Backes',    2),
  ('66666666-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-voix-fr-crea',    'Création Voix FR',   'todo', 'p2', 'LU', null, 'Agnès de Cayeux',  3),
  ('66666666-0003-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-voix-en-crea',    'Création Voix EN',   'todo', 'p2', 'LU', null, 'Agnès de Cayeux',  4),
  ('66666666-0003-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-conception',      'Conception',         'todo', 'p2', 'LU', null, 'Fireflies Studio', 5),
  ('66666666-0003-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-game-design',     'Game design',        'todo', 'p2', 'LU', null, 'Voulez-vous',      6),
  ('66666666-0003-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-polish',          'Polish',             'todo', 'p2', 'LU', null, 'Odran Jobin',      7),
  ('66666666-0003-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-sound-design',    'Sound design',       'todo', 'p2', 'LU', '33333333-0000-0000-0000-000000000009', null, 8),
  ('66666666-0003-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-voix-fr-integ',   'Intégration Voix FR','todo', 'p2', 'LU', null, 'Voulez-vous',      9),
  ('66666666-0003-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-voix-en-integ',   'Intégration Voix EN','todo', 'p2', 'LU', null, 'Voulez-vous',     10),
  ('66666666-0003-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-push-fr',         'Push build FR',      'todo', 'p2', 'LU', null, 'Voulez-vous',     11),
  ('66666666-0003-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-push-en',         'Push build EN',      'todo', 'p2', 'LU', null, 'Voulez-vous',     12),
  ('66666666-0003-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', 'T3-integ-finale',    'Intégration finale', 'todo', 'p2', 'LU', null, 'Voulez-vous',     13)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  -- Prototype : Oct+Nov 2025 S1-S4 (contigu)
  ('66666666-0003-0000-0000-000000000001', '2025-10-01', '2025-11-30', false, null),
  -- Traduction : Déc 2025 S1-S4
  ('66666666-0003-0000-0000-000000000002', '2025-12-01', '2025-12-31', false, null),
  -- Création Voix FR : Jan 2026 S2-S4
  ('66666666-0003-0000-0000-000000000003', '2026-01-08', '2026-01-31', false, null),
  -- Création Voix EN : Jan 2026 S2-S4
  ('66666666-0003-0000-0000-000000000004', '2026-01-08', '2026-01-31', false, null),
  -- Conception : Mai 2026 S1-S4 (à confirmer)
  ('66666666-0003-0000-0000-000000000005', '2026-05-01', '2026-05-31', true, 'à confirmer'),
  -- Game design : Mai 2026 S1-S4
  ('66666666-0003-0000-0000-000000000006', '2026-05-01', '2026-05-31', false, null),
  -- Polish : Mai 2026 S4
  ('66666666-0003-0000-0000-000000000007', '2026-05-22', '2026-05-31', false, null),
  -- Sound design : résidence (21 avr→31 mai, 11 juin→10 juil)
  ('66666666-0003-0000-0000-000000000008', '2026-04-21', '2026-05-31', false, 'résidence sound design'),
  ('66666666-0003-0000-0000-000000000008', '2026-06-11', '2026-07-10', false, 'résidence sound design'),
  -- Intégration Voix FR : Juin 2026 S2-S4 (à confirmer)
  ('66666666-0003-0000-0000-000000000009', '2026-06-08', '2026-06-30', true, 'à confirmer'),
  -- Intégration Voix EN : Juin 2026 S2-S4 (à confirmer)
  ('66666666-0003-0000-0000-000000000010', '2026-06-08', '2026-06-30', true, 'à confirmer'),
  -- Push build FR : Juin 2026 S2-S4
  ('66666666-0003-0000-0000-000000000011', '2026-06-08', '2026-06-30', false, null),
  -- Push build EN : Juil 2026 S1-S2
  ('66666666-0003-0000-0000-000000000012', '2026-07-01', '2026-07-14', false, 'réf. J2'),
  -- Intégration finale : Juil 2026 S2 (deadline 01/07 réception builds VV)
  ('66666666-0003-0000-0000-000000000013', '2026-07-08', '2026-07-14', false, '01/07 DEADLINE réception builds à VV');

-- ============================================================================
-- F. TABLEAU IV — LES PHÉNOMÈNES   (lot …-004, CA — confirmé)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0004-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-prototype',       'Prototype',          'todo', 'p2', 'CA', null, 'Neek Studio',     1),
  ('66666666-0004-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-conception',      'Conception',         'todo', 'p2', 'CA', null, 'Neek Studio',     2),
  ('66666666-0004-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-traduction',      'Traduction',         'todo', 'p2', 'CA', null, 'Ismael Backes',   3),
  ('66666666-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-voix-fr-crea',    'Création Voix FR',   'todo', 'p2', 'CA', null, 'Agnès de Cayeux', 4),
  ('66666666-0004-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-voix-en-crea',    'Création Voix EN',   'todo', 'p2', 'CA', null, 'Agnès de Cayeux', 5),
  ('66666666-0004-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-game-design',     'Game design',        'todo', 'p2', 'CA', null, 'Neek Studio',     6),
  ('66666666-0004-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-polish',          'Polish',             'todo', 'p2', 'CA', null, 'Odran Jobin',     7),
  ('66666666-0004-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-sound-design',    'Sound design',       'todo', 'p2', 'CA', '33333333-0000-0000-0000-000000000009', null, 8),
  ('66666666-0004-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-voix-fr-integ',   'Intégration Voix FR','todo', 'p2', 'CA', '33333333-0000-0000-0000-000000000009', null, 9),
  ('66666666-0004-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-voix-en-integ',   'Intégration Voix EN','todo', 'p2', 'CA', null, 'Voulez-vous',    10),
  ('66666666-0004-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-optimisation',    'Optimisation',       'todo', 'p2', 'CA', null, 'Voulez-vous',    11),
  ('66666666-0004-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-integ-finale',    'Intégration finale', 'todo', 'p2', 'CA', null, 'Voulez-vous',    12),
  ('66666666-0004-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-push-en',         'Push build EN',      'todo', 'p2', 'CA', null, 'Voulez-vous',    13),
  ('66666666-0004-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000004', 'T4-push-fr',         'Push build FR',      'todo', 'p2', 'CA', null, 'Voulez-vous',    14)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  ('66666666-0004-0000-0000-000000000001', '2026-04-01', '2026-04-30', true,  'à confirmer'),
  ('66666666-0004-0000-0000-000000000002', '2026-05-01', '2026-05-31', true,  'à confirmer'),
  ('66666666-0004-0000-0000-000000000003', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0004-0000-0000-000000000004', '2026-01-08', '2026-01-31', false, null),
  ('66666666-0004-0000-0000-000000000005', '2026-01-08', '2026-01-31', false, null),
  -- Game design : Avr+Mai 2026 S1-S4 (à confirmer)
  ('66666666-0004-0000-0000-000000000006', '2026-04-01', '2026-05-31', true,  'à confirmer'),
  ('66666666-0004-0000-0000-000000000007', '2026-05-15', '2026-05-31', true,  'à confirmer'),
  -- Sound design : résidence
  ('66666666-0004-0000-0000-000000000008', '2026-04-21', '2026-05-31', false, 'résidence sound design'),
  ('66666666-0004-0000-0000-000000000008', '2026-06-11', '2026-07-10', false, 'résidence sound design'),
  ('66666666-0004-0000-0000-000000000009', '2026-05-15', '2026-05-31', true,  '01/07 DEADLINE réception builds à VV'),
  ('66666666-0004-0000-0000-000000000010', '2026-05-15', '2026-05-31', true,  'à confirmer'),
  ('66666666-0004-0000-0000-000000000011', '2026-05-15', '2026-05-31', false, null),
  ('66666666-0004-0000-0000-000000000012', '2026-05-15', '2026-05-31', false, null),
  ('66666666-0004-0000-0000-000000000013', '2026-06-01', '2026-06-14', true,  'à confirmer'),
  ('66666666-0004-0000-0000-000000000014', '2026-06-01', '2026-06-14', true,  'à confirmer');

-- ============================================================================
-- G. TABLEAU V — LE DATACENTER   (lot …-005, FR)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0005-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-conception',      'Conception',         'todo', 'p2', 'FR', null, 'Odran Jobin',     1),
  ('66666666-0005-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-developpement',   'Développement',      'todo', 'p2', 'FR', null, 'Odran Jobin',     2),
  ('66666666-0005-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-traduction',      'Traduction',         'todo', 'p2', 'FR', null, 'Ismael Backes',   3),
  ('66666666-0005-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-voix-fr-crea',    'Création Voix FR',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 4),
  ('66666666-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-voix-en-crea',    'Création Voix EN',   'todo', 'p2', 'FR', null, 'Agnès de Cayeux', 5),
  ('66666666-0005-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-sound-design',    'Sound design',       'todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 6),
  ('66666666-0005-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-voix-fr-integ',   'Intégration Voix FR','todo', 'p2', 'FR', '33333333-0000-0000-0000-000000000009', null, 7),
  ('66666666-0005-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-voix-en-integ',   'Intégration Voix EN','todo', 'p2', 'FR', null, 'Voulez-vous',     8),
  ('66666666-0005-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-optimisation',    'Optimisation',       'todo', 'p2', 'FR', null, 'Voulez-vous',     9),
  ('66666666-0005-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-push-en',         'Push build EN',      'todo', 'p2', 'FR', null, 'Voulez-vous',    10),
  ('66666666-0005-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000005', 'T5-push-fr',         'Push build FR',      'todo', 'p2', 'FR', null, 'Voulez-vous',    11)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  -- Conception : Avr 2026 S2-S4 (13.0 ; 1er)
  ('66666666-0005-0000-0000-000000000001', '2026-04-08', '2026-04-30', false, '13.0 ; 1er'),
  -- Développement : Mai 2026 S1-S4 (4.0 ; 15 pré-rendu ; 29.0)
  ('66666666-0005-0000-0000-000000000002', '2026-05-01', '2026-05-31', false, '4.0 ; 15 pré-rendu ; 29.0'),
  ('66666666-0005-0000-0000-000000000003', '2025-12-01', '2025-12-31', false, null),
  ('66666666-0005-0000-0000-000000000004', '2026-01-08', '2026-01-31', false, null),
  ('66666666-0005-0000-0000-000000000005', '2026-01-08', '2026-01-31', false, null),
  -- Sound design : résidence
  ('66666666-0005-0000-0000-000000000006', '2026-04-21', '2026-05-31', false, 'résidence sound design'),
  ('66666666-0005-0000-0000-000000000006', '2026-06-11', '2026-07-10', false, 'résidence sound design'),
  ('66666666-0005-0000-0000-000000000007', '2026-05-15', '2026-05-31', true,  '01/07 DEADLINE réception builds à VV'),
  ('66666666-0005-0000-0000-000000000008', '2026-05-15', '2026-05-31', true,  'réf. J1'),
  ('66666666-0005-0000-0000-000000000009', '2026-05-15', '2026-05-31', false, null),
  -- Push build EN : Juin 2026 S1-S2 (à confirmer). Période violette sep→déc 2025
  -- RETIRÉE — Virginie : « pas besoin de l'avoir » (D9, réponse 2026-05-30).
  ('66666666-0005-0000-0000-000000000010', '2026-06-01', '2026-06-14', true,  'à confirmer'),
  -- Push build FR : Juin 2026 S1-S2 (à confirmer)
  ('66666666-0005-0000-0000-000000000011', '2026-06-01', '2026-06-14', true,  'à confirmer');

-- ============================================================================
-- H. DEV TRANSVERSAL   (lot …-006, country NULL = transversal — D2)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0006-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-transitions',    'Dev transitions',         'todo', 'p2', null, null, 'Voulez-vous',   1),
  ('66666666-0006-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-sound-habillage','Sound design habillage',  'todo', 'p2', null, '33333333-0000-0000-0000-000000000009', null, 2),
  ('66666666-0006-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-trad-transitions','Traductions transitions','todo', 'p2', null, null, 'Ismael Backes', 3),
  ('66666666-0006-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-integ-optim',    'Intégration / optimisation','todo','p2',null, null, 'Voulez-vous',   4),
  ('66666666-0006-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-playtest',       'Playtest',                'todo', 'p2', null, null, 'Dark Euphoria', 5),
  ('66666666-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000006', 'DEV-push-complet',   'Push complet',            'todo', 'p2', null, null, 'Voulez-vous',   6)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  -- Dev transitions : Avr+Mai 2026 S1-S4 (à confirmer)
  ('66666666-0006-0000-0000-000000000001', '2026-04-01', '2026-05-31', true,  'à confirmer'),
  -- Sound design habillage : résidence
  ('66666666-0006-0000-0000-000000000002', '2026-04-21', '2026-05-31', false, 'résidence sound design'),
  ('66666666-0006-0000-0000-000000000002', '2026-06-11', '2026-07-10', false, 'résidence sound design'),
  -- Traductions transitions : Juin 2026 S3-S4
  ('66666666-0006-0000-0000-000000000003', '2026-06-15', '2026-06-30', false, null),
  -- Intégration / optimisation : Juin S3-S4 + Juil S1-S2 (At.1 ; à confirmer)
  ('66666666-0006-0000-0000-000000000004', '2026-06-15', '2026-07-14', true,  'At.1'),
  -- Playtest : Juil 2026 S1-S2 (At.2 ; à confirmer)
  ('66666666-0006-0000-0000-000000000005', '2026-07-01', '2026-07-14', true,  'At.2'),
  -- Push complet : Juil 2026 S2 (à confirmer)
  ('66666666-0006-0000-0000-000000000006', '2026-07-08', '2026-07-14', true,  'à confirmer');

-- ============================================================================
-- I. PROMOTION   (lot …-007, country NULL = transversal — D2)
-- ============================================================================
insert into public.tasks
  (id, project_id, lot_id, external_id, title, status, priority, country, assigned_to, responsable_label, position) values
  ('66666666-0007-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', 'PROMO-teaser',     'Teaser',          'todo', 'p2', null, null, 'Poulpe Bleu',    1),
  ('66666666-0007-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', 'PROMO-crea-graph', 'Créa graphique',  'todo', 'p2', null, null, 'Poulpe Bleu',    2),
  ('66666666-0007-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', 'PROMO-press-kit',  'Press kit',       'todo', 'p2', null, null, 'Dark Euphoria',  3),
  ('66666666-0007-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', 'PROMO-residence',  'Résidence',       'todo', 'p2', null, null, 'Dark Euphoria',  4),
  ('66666666-0007-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', 'PROMO-diffusion',  'Diffusion',       'todo', 'p2', null, null, 'Dark Euphoria',  5)
on conflict (id) do update set
  lot_id=excluded.lot_id, external_id=excluded.external_id, title=excluded.title,
  country=excluded.country, assigned_to=excluded.assigned_to,
  responsable_label=excluded.responsable_label, position=excluded.position;

insert into public.task_periods (task_id, start_date, end_date, is_tentative, note) values
  -- Teaser : Mai+Juin 2026 S1-S4 + Juil S1 (contigu)
  ('66666666-0007-0000-0000-000000000001', '2026-05-01', '2026-07-07', false, null),
  -- Créa graphique : Déc 2025 S3-S4 · Mai 2026 S1 (att presta LUX) · Mai S3-S4
  ('66666666-0007-0000-0000-000000000002', '2025-12-15', '2025-12-31', false, null),
  ('66666666-0007-0000-0000-000000000002', '2026-05-01', '2026-05-07', false, 'att. propos presta par LUX'),
  ('66666666-0007-0000-0000-000000000002', '2026-05-15', '2026-05-31', false, null),
  -- Press kit : Déc 2025 S3-S4 · Mai 2026 S3-S4
  ('66666666-0007-0000-0000-000000000003', '2025-12-15', '2025-12-31', false, null),
  ('66666666-0007-0000-0000-000000000003', '2026-05-15', '2026-05-31', false, null),
  -- Résidence : Mar 2026 S4 (Grenier à Sel — scéno 23-27)
  ('66666666-0007-0000-0000-000000000004', '2026-03-22', '2026-03-31', false, 'Grenier à Sel — scéno 23-27'),
  -- Diffusion : Août S1 (.apk Venise) · Sep S1 (Mostra 2-12) · Oct S4 (Chroniques)
  ('66666666-0007-0000-0000-000000000005', '2026-08-01', '2026-08-07', false, 'deadline envoi .apk Venise'),
  ('66666666-0007-0000-0000-000000000005', '2026-09-01', '2026-09-07', false, 'Mostra de Venise 2–12 sept'),
  ('66666666-0007-0000-0000-000000000005', '2026-10-22', '2026-10-31', false, 'Chroniques');

-- ============================================================================
-- J. JALONS MANQUANTS (milestones) — réutilisation de la table existante (D6)
-- ============================================================================
-- ⚠️ Dédupliqué contre 007 : « Lancement Venise Immersive — livraison »
--   (2026-08-24) et « Première publique SILA » existent déjà — non réinsérés.
--   La Mostra (événement 2-12 sept) est DISTINCTE de la livraison (décision Pierre).
insert into public.milestones
  (id, project_id, lot_id, funder_id, title, start_date, end_date, type, country, notes, created_by) values
  ('6d000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', null,
   'Showcase SXSW', '2026-03-08', '2026-03-14', 'festival', 'FR',
   'Source planning : grise toute la semaine du Tableau II (S2 mars). Impacte Tab. II.', null),
  ('6d000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null, null,
   'Deadline réception des builds par Voulez-Vous', '2026-07-01', null, 'jalon_production', 'FR',
   'Concerne Tableaux III, IV et V. « 01/07 DEADLINE — Réception des builds à VV ».', null),
  ('6d000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', null,
   'Résidence Grenier à Sel — scénographie', '2026-03-23', '2026-03-27', 'jalon_production', 'FR',
   'Promotion / Dark Euphoria. Scéno 23–27 mars.', null),
  ('6d000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', null,
   'Deadline envoi .apk Venise', '2026-08-01', null, 'jalon_production', 'CA',
   'Promotion / Diffusion. Deadline envoi .apk pour la Mostra.', null),
  ('6d000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', null,
   'Mostra de Venise', '2026-09-02', '2026-09-12', 'festival', 'FR',
   'Promotion / Diffusion. Événement 2–12 sept (distinct de la livraison du 24/08).', null),
  ('6d000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000007', null,
   'Chroniques', '2026-10-22', '2026-10-28', 'festival', 'FR',
   'Promotion / Diffusion. Oct 2026 S4.', null)
on conflict (id) do nothing;

commit;

-- VÉRIFICATION post-application :
--   select l.name, count(t.id) from public.lots l
--     left join public.tasks t on t.lot_id = l.id and t.external_id is not null
--     where l.project_id = '11111111-1111-1111-1111-111111111111'
--     group by l.name order by l.sort_order;        -- 7 lots, total 76 tâches
--   select count(*) from public.task_periods;        -- ≈ 108 périodes
--   select count(*) from public.milestones
--     where id like '6d000000-%';                     -- 6 jalons
