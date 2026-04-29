-- ============================================================================
-- 023_comment_addressed_to.sql
--
-- Demande Virginie 2026-04-29 : pouvoir adresser un commentaire à quelqu'un
-- (mention d'une personne par son prénom). Implémentation minimale Phase 2 :
-- une seule personne adressée par commentaire, via dropdown à côté de la
-- zone de saisie. Pas de notification email (Phase 3).
--
-- Schéma :
--   comments.addressed_to (uuid, FK users, nullable, ON DELETE SET NULL)
--
-- RLS : pas de modification — la lecture/écriture des commentaires reste
-- soumise aux mêmes règles. L'addressed_to est un simple champ d'affichage,
-- pas une couche de visibilité.
-- ============================================================================

alter table public.comments
  add column addressed_to uuid references public.users(id) on delete set null;
