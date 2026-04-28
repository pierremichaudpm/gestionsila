-- ============================================================================
-- 010_budget_extensions.sql
--
-- Articulation du budget canadien selon la structure SODEC (codes 01-15, F, G,
-- avec ventilation par origine de coût : interne / apparente / externe) et
-- nouvelle table funding_sources pour la vue Structure financière (sources
-- par pays, montants contractuels en EUR et CAD séparés).
--
-- PARTIE A — Budget Canada
--   1. Colonnes code + cost_origin sur budget_lines (les autres pays peuvent
--      les laisser NULL)
--   2. Taux de change EUR → CAD = 1.6232 (date 2025-10-10) sur project_settings
--   3. Suppression des 4 lignes démo JAXA, insertion des 19 lignes réelles
--      du budget Canada (17 postes du devis SODEC, dont 2 postes éclatés en
--      2 lignes pour conserver une cost_origin non ambiguë).
--
-- PARTIE B — Structure financière
--   1. Table funding_sources (id, project_id, country, source_name,
--      amount_eur, amount_cad, status, notes, sort_order, timestamps).
--      Les deux montants sont stockés séparément : ils proviennent d'un
--      contrat figé à un taux historique (souvent ≠ du taux courant).
--   2. RLS gated par has_producer_access AVANT règles fines : coproducer
--      écrit son pays, production_manager lecture seule, contractor exclu.
--   3. Import des 22 sources connues (CA: 2, FR: 16, LU: 4).
-- ============================================================================

-- ============================================================================
-- PARTIE A — Budget Canada
-- ============================================================================

-- 1. Colonnes code + cost_origin
alter table public.budget_lines
  add column code        text,
  add column cost_origin text check (cost_origin in ('interne', 'apparente', 'externe'));

create index budget_lines_org_code_idx
  on public.budget_lines(project_id, org_id, code);

-- 2. Taux de change : ajout de la date + mise à jour SILA
alter table public.project_settings
  add column exchange_rate_date date;

update public.project_settings
   set exchange_rate_eur_to_cad = 1.6232,
       exchange_rate_date       = '2025-10-10'
 where project_id = '11111111-1111-1111-1111-111111111111';

-- 3. Suppression des 4 lignes démo JAXA (les démos DE et PB restent
-- comme placeholders en attendant les vrais devis France / Luxembourg).
delete from public.budget_lines
 where id in (
   '66666666-0000-0000-0000-000000000001',
   '66666666-0000-0000-0000-000000000002',
   '66666666-0000-0000-0000-000000000003',
   '66666666-0000-0000-0000-000000000004'
 );

-- 4. Insertion des 19 lignes réelles du budget Canada (devis SODEC). Total
-- = 120 327 CAD. Les codes 03 et 04 ont chacun été éclatés en 2 lignes
-- (option "split") pour ne pas mélanger les origines de coût.
insert into public.budget_lines
  (id, project_id, lot_id, org_id, code, category, planned, actual, currency, cost_origin)
values
  ('66666666-0000-0000-0000-CA0000000001', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '01', 'Productrice / Producteur',                12356.00, 0, 'CAD', 'interne'),
  ('66666666-0000-0000-0000-CA0000000002', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '02', 'Achat de droits',                          3000.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000003', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '03', 'Préparation de la présentation du projet', 500.00,  0, 'CAD', 'interne'),
  ('66666666-0000-0000-0000-CA0000000004', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '03', 'Préparation de la présentation du projet', 1000.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000005', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '04', 'Postes clés',                              5600.00, 0, 'CAD', 'apparente'),
  ('66666666-0000-0000-0000-CA0000000006', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '04', 'Postes clés',                             18200.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000007', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '05', 'Main-d''œuvre de la conception',          20730.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000008', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '06', 'Main-d''œuvre de la programmation',       31800.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000009', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '07', 'Main-d''œuvre audio / vidéo',                 0.00, 0, 'CAD', null),
  ('66666666-0000-0000-0000-CA0000000010', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '08', 'Artistes',                                    0.00, 0, 'CAD', null),
  ('66666666-0000-0000-0000-CA0000000011', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '09', 'Main-d''œuvre de l''administration',       1500.00, 0, 'CAD', 'interne'),
  ('66666666-0000-0000-0000-CA0000000012', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '10', 'Autre main-d''œuvre',                      2500.00, 0, 'CAD', 'apparente'),
  ('66666666-0000-0000-0000-CA0000000013', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '11', 'Matériel et fournitures',                  1540.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000014', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '12', 'Matériel et fournitures audio / vidéo',     500.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000015', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '13', 'Mise en marché et exploitation',              0.00, 0, 'CAD', null),
  ('66666666-0000-0000-0000-CA0000000016', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '14', 'Promotion et publicité',                      0.00, 0, 'CAD', null),
  ('66666666-0000-0000-0000-CA0000000017', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', '15', 'Administration',                           5450.00, 0, 'CAD', 'externe'),
  ('66666666-0000-0000-0000-CA0000000018', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', 'F',  'Frais d''administration',                 12356.00, 0, 'CAD', 'interne'),
  ('66666666-0000-0000-0000-CA0000000019', '11111111-1111-1111-1111-111111111111',
   null, '22222222-0000-0000-0000-000000000001', 'G',  'Imprévus',                                 3295.00, 0, 'CAD', 'externe');

-- ============================================================================
-- PARTIE B — Structure financière
-- ============================================================================

create table public.funding_sources (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  country     char(2) not null check (country in ('CA', 'FR', 'LU')),
  source_name text not null,
  amount_eur  numeric(14, 4),
  amount_cad  numeric(14, 4),
  status      text not null default 'expected' check (status in ('acquired', 'expected')),
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index funding_sources_project_country_idx on public.funding_sources(project_id, country, sort_order);

create trigger funding_sources_set_updated_at
  before update on public.funding_sources
  for each row execute function public.set_updated_at();

alter table public.funding_sources enable row level security;

-- SELECT : barrière has_producer_access AVANT lecture (même que budget_lines)
create policy funding_sources_select on public.funding_sources
  for select to authenticated using (
    public.has_producer_access(project_id)
    and public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
  );

-- INSERT / UPDATE / DELETE : admin tout, coproducer son pays uniquement.
-- production_manager (lecture seule) et contractor (exclus) bloqués.
create policy funding_sources_insert on public.funding_sources
  for insert to authenticated with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and country = public.current_user_country()
      )
    )
  );

create policy funding_sources_update on public.funding_sources
  for update to authenticated
  using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and country = public.current_user_country()
      )
    )
  )
  with check (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and country = public.current_user_country()
      )
    )
  );

create policy funding_sources_delete on public.funding_sources
  for delete to authenticated using (
    public.has_producer_access(project_id)
    and (
      public.project_access_level(project_id) = 'admin'
      or (
        public.project_access_level(project_id) = 'coproducer'
        and country = public.current_user_country()
      )
    )
  );

-- Import des 22 sources de financement connues.
-- Les amount_cad proviennent du CSV contractuel : ils peuvent diverger d'une
-- conversion live amount_eur × 1.6232 (taux historique différent côté FR/LU).
-- C'est volontaire — les écarts seront affichés dans la vue.
insert into public.funding_sources
  (id, project_id, country, source_name, amount_eur, amount_cad, status, notes, sort_order)
values
  -- Québec (CA)
  ('99999999-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'CA', 'SODEC — Volet 2 (Projets narratifs numériques formats courts)', 71277.0000, 115000.0000, 'acquired', null, 1),
  ('99999999-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'CA', 'JAXA Production — Part producteur (investissement)',             3301.2400,   5326.3000, 'acquired', null, 2),

  -- France (FR)
  ('99999999-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'FR', 'CNC Création Immersive — aide à la préproduction',              50000.0000,  80675.0000, 'acquired', null, 3),
  ('99999999-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'FR', 'Région SUD PACA — aide au développement',                       13000.0000,  20975.5000, 'acquired', null, 4),
  ('99999999-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'FR', 'Dark Euphoria (apport)',                                        23945.0000,  38635.2575, 'acquired', null, 5),
  ('99999999-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
   'FR', 'Voulez-Vous (apport)',                                           5000.0000,   8067.5000, 'acquired', null, 6),
  ('99999999-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
   'FR', 'ArtZoyd (participation)',                                        8100.0000,  13069.3500, 'acquired', null, 7),
  ('99999999-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
   'FR', 'Diffuseurs (SIANA)',                                             5000.0000,   8067.5000, 'acquired', null, 8),
  ('99999999-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
   'FR', 'Pictanovo — aide à la production',                              12000.0000,  19362.0000, 'acquired', 'Lettre à fournir', 9),
  ('99999999-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
   'FR', 'Chroniques (participation)',                                    25000.0000,  40337.5000, 'acquired', null, 10),
  ('99999999-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111',
   'FR', 'Le Grenier à Sel (participation)',                               8000.0000,  12908.0000, 'acquired', null, 11),
  ('99999999-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111',
   'FR', 'Métropole Montpellier Méditerranée',                            15000.0000,  24202.5000, 'acquired', null, 12),
  ('99999999-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111',
   'FR', 'Région SUD PACA — aide à la production',                        20000.0000,  32270.0000, 'acquired', null, 13),
  ('99999999-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111',
   'FR', 'CNC Création Immersive — aide à la production',                 40000.0000,  64540.0000, 'acquired', 'Modifié + Lettre à fournir', 14),
  ('99999999-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111',
   'FR', 'Dark Euphoria (apport production)',                             37840.0000,  61054.8400, 'acquired', null, 15),
  ('99999999-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111',
   'FR', 'Voulez-Vous (apport production)',                               45000.0000,  72607.5000, 'acquired', 'Modifié + lettre investissement à mettre à jour', 16),
  ('99999999-0000-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111',
   'FR', 'Le Safran',                                                     2500.0000,   4033.7500, 'acquired', 'Modifié + Lettre à fournir', 17),
  ('99999999-0000-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111',
   'FR', 'Diffuseurs (TBD)',                                             17500.0000,  28236.2500, 'expected', null, 18),

  -- Luxembourg (LU)
  ('99999999-0000-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111',
   'LU', 'Filmfund Luxembourg (développement)',                          45000.0000,  72607.5000, 'acquired', null, 19),
  ('99999999-0000-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111',
   'LU', 'Poulpe Bleu — Part Producteur (développement)',                  805.0000,   1298.8675, 'acquired', null, 20),
  ('99999999-0000-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111',
   'LU', 'Filmfund Luxembourg AFS — production',                        167196.0000, 269770.7460, 'expected', 'En attente mi-mai', 21),
  ('99999999-0000-0000-0000-000000000022', '11111111-1111-1111-1111-111111111111',
   'LU', 'Poulpe Bleu — Part Producteur (production)',                    3000.0000,   4840.5000, 'acquired', null, 22);
