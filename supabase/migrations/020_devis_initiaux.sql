-- ============================================================================
-- 020_devis_initiaux.sql
--
-- Demande Virginie : compléter l'Espace Producteurs avec un dossier
-- "Devis initiaux" sous Budget. C'est une trace figée des devis Excel
-- originaux déposés aux bailleurs, indépendante de l'évolution du module
-- Budget interactif.
--
-- 1. Étendre le CHECK constraint sur producer_documents.folder pour
--    inclure 'devis_initiaux' (en plus d'assurances et legal).
-- 2. Ajouter une colonne version_devis (text, nullable) — utilisée
--    uniquement pour folder='devis_initiaux'. Pas de constraint forçant
--    cette logique : c'est une convention UI (le champ s'affiche dans
--    la modal seulement quand folder=devis_initiaux).
-- ============================================================================

-- Le nom de la check constraint est auto-généré par Postgres ; résolu
-- dynamiquement avant d'être recréé avec le nouveau set de valeurs.
do $$
declare
  con_name text;
begin
  select conname into con_name
    from pg_constraint
   where conrelid = 'public.producer_documents'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%folder%';
  if con_name is not null then
    execute format('alter table public.producer_documents drop constraint %I', con_name);
  end if;
end $$;

alter table public.producer_documents
  add constraint producer_documents_folder_check
  check (folder in ('assurances', 'legal', 'devis_initiaux'));

alter table public.producer_documents
  add column version_devis text;
