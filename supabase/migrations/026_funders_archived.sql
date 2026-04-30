-- ============================================================================
-- 026_funders_archived.sql
--
-- Archivage des bailleurs (Section 3 du batch 2026-04-30).
--
-- Virginie veut « clore » un bailleur sans le supprimer (l'historique reste
-- accessible). Cas d'usage immédiat : FilmFund Luxembourg — Dév. (45 000 EUR
-- acquis), dont le programme de développement est terminé et qui ne donnera
-- plus lieu à de nouveaux livrables.
--
-- Décision Virginie 2026-04-30 (option C) :
--   - Supprimer le livrable « FilmFund Dév. — note d'intention » (id 0003).
--     Statut « submitted » au moment de la décision — pas de validation
--     formelle ; c'est un livrable qui n'a plus d'objet.
--   - Archiver le bailleur (flag archived=true).
--
-- Pas de timestamp / pas de FK auteur ici, contrairement à milestones.archived
-- (025) : l'archive d'un bailleur est un acte rare, déclenché par l'admin,
-- avec moins de besoin d'audit fin. Si on en veut plus tard on étendra.
--
-- Ajout d'une colonne `notes` (text nullable) sur funders : demandée par
-- Virginie pour pouvoir consigner les conditions / commentaires d'un
-- bailleur depuis le slide-over d'édition.
--
-- RLS : pas de nouvelle policy. funders_update existante (017 — admin
-- partout, coproducer/PM sur leur pays) couvre déjà l'écriture du flag.
-- ============================================================================

begin;

alter table public.funders
  add column archived boolean not null default false,
  add column notes    text    null;

create index funders_archived_idx on public.funders(project_id, archived);

-- ----------------------------------------------------------------------------
-- Suppression du livrable FFL Dév. (décision Virginie 2026-04-30 — option C).
-- DELETE par id exact pour ne pas affecter d'éventuels autres livrables
-- ajoutés en prod entre l'écriture de la migration et son application.
-- ----------------------------------------------------------------------------
delete from public.deliverables
 where id = '88888888-0000-0000-0000-000000000003';

-- ----------------------------------------------------------------------------
-- Archivage du bailleur FilmFund Luxembourg — Dév.
-- ----------------------------------------------------------------------------
update public.funders
   set archived = true
 where id = '55555555-0000-0000-0000-000000000003';

commit;
