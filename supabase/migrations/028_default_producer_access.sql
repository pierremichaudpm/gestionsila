-- ============================================================================
-- 028_default_producer_access.sql
--
-- Trigger BEFORE INSERT sur project_members : si on insère un membre avec
-- access_level admin ou coproducer et qu'on ne spécifie PAS has_producer_access
-- (donc la valeur par défaut false du DDL), on bascule automatiquement à true.
--
-- Justification (option a confirmée par Pierre 2026-05-05) :
--   - On garde le flag has_producer_access indépendant du rôle (Virginie veut
--     pouvoir donner / retirer finement, ex. Mathieu n'a pas l'accès même
--     s'il est coproducer).
--   - On simplifie juste la création de comptes coproducer en cochant
--     l'accès par défaut, plutôt que d'oublier de le faire à chaque ajout.
--   - L'admin peut toujours désactiver via le toggle Paramètres → Accès
--     Espace Producteurs.
--
-- Limites (volontaires) :
--   - Ne touche PAS les lignes existantes. Si Virginie veut aligner Mathieu
--     ou d'autres comptes existants, c'est un acte manuel via Paramètres.
--   - Ne réagit PAS sur UPDATE de access_level. Promouvoir un contractor en
--     coproducer ne flippe pas has_producer_access — l'admin doit cocher
--     manuellement (cohérent avec la philosophie : l'accès Espace
--     Producteurs reste une décision distincte du rôle).
--   - Si l'admin insère explicitement un coproducer avec
--     has_producer_access=false (cas exceptionnel, via SQL direct), le
--     trigger l'écrase à true. Workaround : INSERT puis UPDATE immédiat.
--     En pratique, cela n'arrive qu'au seed (où on accepte la nouvelle
--     règle) ou via la dashboard Supabase (rare).
-- ============================================================================

create or replace function public.default_producer_access()
returns trigger
language plpgsql
as $$
begin
  if new.access_level in ('admin', 'coproducer') and new.has_producer_access = false then
    new.has_producer_access := true;
  end if;
  return new;
end;
$$;

drop trigger if exists project_members_default_producer_access on public.project_members;

create trigger project_members_default_producer_access
  before insert on public.project_members
  for each row
  execute function public.default_producer_access();
