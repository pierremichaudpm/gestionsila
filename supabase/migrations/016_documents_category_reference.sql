-- ============================================================================
-- 016_documents_category_reference.sql
--
-- Ajoute 'reference' aux valeurs autorisées de documents.category. La catégorie
-- est globale (utilisée dans tous les sous-dossiers) mais Virginie l'a
-- demandée principalement pour le sous-dossier Techno (specs, datasheets,
-- documentation tierce).
-- ============================================================================

-- Le nom de la check constraint est auto-généré par Postgres ; on le résout
-- dynamiquement avant de le recréer.
do $$
declare
  con_name text;
begin
  select conname into con_name
    from pg_constraint
   where conrelid = 'public.documents'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%category%';
  if con_name is not null then
    execute format('alter table public.documents drop constraint %I', con_name);
  end if;
end $$;

alter table public.documents
  add constraint documents_category_check
  check (category in (
    'contract',
    'scenario',
    'artistic_dossier',
    'report',
    'technical_deliverable',
    'invoice',
    'reference'
  ));
