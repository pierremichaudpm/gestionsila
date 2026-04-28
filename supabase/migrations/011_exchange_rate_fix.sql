-- ============================================================================
-- 011_exchange_rate_fix.sql
--
-- Correction du taux EUR→CAD : 1.6232 (010) → 1.6135. C'est le taux utilisé
-- dans le CSV structure_financiere.csv pour calculer les amount_cad
-- contractuels. Aligner project_settings sur ce taux supprime les écarts
-- artificiels affichés dans la vue Structure financière côté FR / LU
-- (causés par la divergence taux courant ≠ taux contractuel).
--
-- Inverse pour mémoire / affichage UI : 1 CAD = 0,6198 EUR.
-- ============================================================================

update public.project_settings
   set exchange_rate_eur_to_cad = 1.6135,
       exchange_rate_date       = '2025-10-10'
 where project_id = '11111111-1111-1111-1111-111111111111';
