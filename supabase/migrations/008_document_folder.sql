-- ============================================================================
-- 008_document_folder.sql
--
-- Ajoute un champ d'organisation `folder` à la table documents pour permettre
-- une vue à deux niveaux dans l'UI (4 sous-dossiers : Techno / Création /
-- Texte / Divers) sans toucher à la `category` existante (qui pilote toujours
-- les badges colorés et reste utile pour le filtrage fin).
--
-- Mapping de référence (à appliquer aussi à la création de fiche depuis l'UI) :
--   techno    ← technical_deliverable
--   creation  ← artistic_dossier, scenario
--   texte     ← contract, report
--   divers    ← invoice, et fallback pour tout le reste
--
-- Backfill : la table documents est vide en prod au moment de cette migration
-- (vérifié 2026-04-28). Le default 'divers' couvre tout futur INSERT qui
-- n'aurait pas encore le champ. Si plus tard des fiches existent avec une
-- folder par défaut à corriger, faire un UPDATE ciblé du type :
--
--   update public.documents set folder = 'techno'
--    where category = 'technical_deliverable' and folder = 'divers';
--
-- RLS inchangée : `folder` est un simple champ d'organisation, les règles
-- existantes par pays / rôle s'appliquent identiquement.
-- ============================================================================

alter table public.documents
  add column folder text not null default 'divers';

alter table public.documents
  add constraint documents_folder_check
  check (folder in ('techno', 'creation', 'texte', 'divers'));

create index documents_project_folder_idx
  on public.documents(project_id, folder);
