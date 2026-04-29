-- ============================================================================
-- 022_restore_milestone_title.sql
--
-- Retour Virginie 2026-04-29 : le titre du jalon "Préparation moodboard, DA
-- et storyboard" (id 77777777-0000-0000-0000-000000000101, importé via la
-- migration 007) avait été modifié par erreur en "Préparation storyboard"
-- pendant les tests d'édition. Restaurer la valeur d'origine.
--
-- Le bypass `session_replication_role = replica` désactive temporairement
-- les triggers (track_imported_changes en particulier) pour ne pas inscrire
-- "Préparation storyboard" comme valeur d'origine dans imported_value (la
-- vraie valeur d'origine étant "Préparation moodboard, DA et storyboard").
-- ============================================================================

begin;
set local session_replication_role = replica;

update public.milestones
   set title = 'Préparation moodboard, DA et storyboard'
 where id = '77777777-0000-0000-0000-000000000101'
   and title <> 'Préparation moodboard, DA et storyboard';

commit;
