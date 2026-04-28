-- ============================================================================
-- 007_seed_real_milestones.sql
--
-- Remplace les 6 jalons de démonstration insérés au seed par les jalons réels
-- de l'échéancier de production SILA — Tableau IV (avril → août 2026), tels
-- que validés par Virginie le 2026-04-28.
--
-- Choix éditoriaux confirmés :
--   - Tous les éléments importés concernent le Tableau IV (lot 4 — JAXA / CA).
--   - Tous les éléments importés sont des jalons internes (jalon_production,
--     festival ou premiere) ; aucun n'est un dépôt à un bailleur.
--   - Pour les périodes "mai", "mai-juin", etc., start_date = 1er du mois de
--     début, end_date = dernier jour du mois de fin. La période d'origine est
--     conservée en notes ("Indication échéancier : …").
--   - Le statut ("Complété" / "En cours" / "À venir") est conservé en notes
--     ("Statut : …").
--   - Pour les jalons ponctuels (Prototype validé · Timing-interaction,
--     Lancement Venise, Première publique), end_date = NULL — ce qui distingue
--     un point dans le temps d'une plage. La colonne end_date passe donc
--     NULLable ici (en complément de 006 qui l'avait créée NOT NULL).
-- ============================================================================

-- Permet d'avoir des jalons ponctuels (end_date NULL) en plus des plages.
alter table public.milestones alter column end_date drop not null;

-- Supprime les 6 jalons démo (idempotent : no-op si déjà absents).
delete from public.milestones
 where id in (
   '77777777-0000-0000-0000-000000000001',
   '77777777-0000-0000-0000-000000000002',
   '77777777-0000-0000-0000-000000000003',
   '77777777-0000-0000-0000-000000000004',
   '77777777-0000-0000-0000-000000000005',
   '77777777-0000-0000-0000-000000000006'
 );

-- Insertion de l'échéancier réel. IDs déterministes (préfixe 77...).
insert into public.milestones
  (id, project_id, lot_id, title, start_date, end_date, type, country, notes, created_by)
values
  ('77777777-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Préparation moodboard, DA et storyboard',
   '2025-09-01', '2025-09-30', 'jalon_production', 'CA',
   'Indication échéancier : sept. 2025 · Statut : En cours · Resp. Aude',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000102', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Sélection captures photogrammétriques de glaciers',
   '2026-04-01', '2026-04-30', 'jalon_production', 'CA',
   'Indication échéancier : avril 2026 · Statut : Complété · Resp. Aude',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000103', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Extraction des données',
   '2026-04-01', '2026-04-30', 'jalon_production', 'CA',
   'Indication échéancier : avril 2026 · Statut : En cours · Resp. Aude / Neek · Aide photogrammétrie / artiste 3D (Neek)',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000104', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Élaboration du monde virtuel — maquette',
   '2026-05-01', '2026-05-31', 'jalon_production', 'CA',
   'Indication échéancier : mai 2026 · Statut : À venir · Resp. Aude · Consultation UX et interaction (Neek)',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000105', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Création du monde virtuel (3D, texturing, éclairage, optimisation)',
   '2026-05-01', '2026-06-30', 'jalon_production', 'CA',
   'Indication échéancier : mai–juin 2026 · Statut : À venir · Resp. Aude / Neek · Optimisation, reprojection, normal baking des assets 3D (Neek)',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000106', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Conception trame sonore — Tableau IV',
   '2026-05-01', '2026-05-31', 'jalon_production', 'CA',
   'Indication échéancier : mai 2026 · Statut : À venir · Resp. Aude',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000107', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Conception UX et interaction',
   '2026-04-01', '2026-05-31', 'jalon_production', 'CA',
   'Indication échéancier : avr.–mai 2026 · Statut : À venir · Resp. Aude / Neek',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000108', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Développement interactif',
   '2026-06-01', '2026-06-30', 'jalon_production', 'CA',
   'Indication échéancier : juin 2026 · Statut : À venir · Resp. Aude / Neek',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000109', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Intégration univers IV — assets, sons, musique, voix',
   '2026-06-01', '2026-07-31', 'jalon_production', 'CA',
   'Indication échéancier : juin–juillet 2026 · Statut : À venir · Resp. Neek (lead dev) · Intégration assets dans Unreal + test build mobile',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000110', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Intégration univers I-II-III-V — assets, sons, musique, voix',
   '2026-07-01', '2026-08-31', 'jalon_production', 'CA',
   'Indication échéancier : juillet–août 2026 · Statut : À venir · Resp. Neek (lead dev) · Aide à Voulez-Vous pour l''intégration',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000111', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Itération 1 — Validation des 1ers assets 3D',
   '2026-06-01', '2026-06-30', 'jalon_production', 'CA',
   'Indication échéancier : juin 2026 · Statut : À venir · Resp. Équipe',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000112', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Itération 2 — Tests après intégration Tableau IV',
   '2026-07-01', '2026-07-31', 'jalon_production', 'CA',
   'Indication échéancier : juillet 2026 · Statut : À venir · Resp. Équipe / Aude / Neek',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000113', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Itération 3 — Tests après intégration des 5 tableaux',
   '2026-08-01', '2026-08-31', 'jalon_production', 'CA',
   'Indication échéancier : août 2026 · Statut : À venir · Resp. Équipe / Aude / Neek',
   '33333333-0000-0000-0000-000000000001'),

  -- Jalons ponctuels (end_date NULL)
  ('77777777-0000-0000-0000-000000000114', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Prototype validé · Timing-interaction établis',
   '2026-05-30', null, 'jalon_production', 'CA',
   'Statut : À venir · Resp. Aude / Neek · Aude non disponible 10–12 et 23 mai (jalon Gantt confirmé)',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000115', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Lancement Venise Immersive — livraison',
   '2026-08-24', null, 'festival', 'CA',
   'Statut : À venir · Festival international · Date de livraison contractuelle Venise Immersive 2026',
   '33333333-0000-0000-0000-000000000001'),

  ('77777777-0000-0000-0000-000000000116', '11111111-1111-1111-1111-111111111111',
   '44444444-0000-0000-0000-000000000004',
   'Première publique SILA',
   '2026-10-01', null, 'premiere', 'CA',
   'Statut : À venir · Date à confirmer · Première publique SILA — Héroïnes Arctiques',
   '33333333-0000-0000-0000-000000000001');
