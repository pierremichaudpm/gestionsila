-- 036_unify_planning_into_calendar.sql
--
-- Unification du Planning dans le Calendrier (décision Virginie 2026-02 après test).
-- Le Gantt du Calendrier (mode "funder", swimlanes bailleurs + Production interne
-- CA/FR/LU) affichera désormais aussi les tâches. La page /planning est supprimée.
--
-- Conséquence sur les données : les tâches DEV transversal / PROMO (regroupées en
-- 035 sous 2 lots dédiés country=NULL) doivent apparaître dans « Production interne
-- — FR » (précision Virginie). On les remet donc en lot_id=NULL / country='FR' et on
-- supprime les 2 lots transversaux DEV/PROMO créés en 035.
--
-- À LANCER APRÈS 035 dans le SQL Editor.
--
-- Lots concernés (créés en 035) :
--   Dev transversal → 44444444-0000-0000-0000-000000000006
--   Promotion       → 44444444-0000-0000-0000-000000000007
--
-- ⚠️ INTÉGRITÉ FK (vérifiée avant écriture) : toutes les FK lot_id sont
--   ON DELETE SET NULL (tasks depuis 031, milestones 003, documents/budget 001).
--   Le DELETE des lots ne casse rien et ne perd aucune donnée. MAIS 4 jalons
--   seedés en 035 pointent sur le lot Promotion (…-007) — Résidence Grenier à Sel,
--   Deadline .apk Venise, Mostra de Venise, Chroniques. On les détache
--   EXPLICITEMENT (étape 2) pour que l'intention soit claire ; ils conservent leur
--   country (FR/CA) → restent dans « Production interne — FR/CA » sur le Gantt.
--   task_periods : FK ON DELETE CASCADE sur task_id (pas sur lot) → les tâches
--   survivent (lot_id→NULL), donc leurs périodes aussi. Rien à faire.

begin;

-- 1. Détacher les tâches DEV/PROMO → transversal FR.
--    (Le SET NULL via FK ne poserait QUE lot_id=NULL ; on veut AUSSI country='FR',
--     d'où l'UPDATE explicite avant le DELETE.)
update public.tasks
   set lot_id = null,
       country = 'FR'
 where project_id = '11111111-1111-1111-1111-111111111111'
   and lot_id in (
     '44444444-0000-0000-0000-000000000006',  -- Dev transversal
     '44444444-0000-0000-0000-000000000007'   -- Promotion
   );

-- 2. Détacher explicitement les jalons rattachés au lot Promotion (…-007).
--    country conservé tel quel (la plupart FR, .apk Venise = CA).
update public.milestones
   set lot_id = null
 where project_id = '11111111-1111-1111-1111-111111111111'
   and lot_id in (
     '44444444-0000-0000-0000-000000000006',
     '44444444-0000-0000-0000-000000000007'
   );

-- 3. Supprimer les 2 lots transversaux (plus rien ne doit les référencer).
delete from public.lots
 where id in (
   '44444444-0000-0000-0000-000000000006',
   '44444444-0000-0000-0000-000000000007'
 );

commit;

-- VÉRIFICATION post-application (à exécuter à part) :
--   -- doit renvoyer 0 ligne :
--   select id, name from public.lots
--    where id in ('44444444-0000-0000-0000-000000000006',
--                 '44444444-0000-0000-0000-000000000007');
--   -- les tâches ex-DEV/PROMO doivent être lot_id NULL / country 'FR' :
--   select count(*) from public.tasks
--    where country = 'FR' and lot_id is null
--      and (external_id like 'DEV-%' or external_id like 'PROMO-%');
--   -- les 4 jalons Promotion doivent être lot_id NULL, country conservé :
--   select title, lot_id, country from public.milestones
--    where id in ('6d000000-0000-0000-0000-000000000003',
--                 '6d000000-0000-0000-0000-000000000004',
--                 '6d000000-0000-0000-0000-000000000005',
--                 '6d000000-0000-0000-0000-000000000006');
