-- ============================================================================
-- 025_milestones_archived.sql
--
-- Archivage des jalons (Section 1 du batch 2026-04-30).
--
-- Virginie veut pouvoir « finir » un jalon sans le supprimer : une case à
-- cocher sur chaque entrée timeline / Gantt qui le bascule dans une section
-- Archive repliable. Décocher = retour parmi les jalons actifs.
--
-- 3 colonnes :
--   archived       (bool NOT NULL default false)  — flag actif/archivé
--   archived_at    (timestamptz nullable)         — quand
--   archived_by    (FK users nullable)            — qui
--
-- Trigger BEFORE INSERT/UPDATE qui force archived_at / archived_by côté
-- serveur (pattern 019 — autoritatif, ignore les valeurs envoyées par le
-- client). Échappatoire `auth.uid() IS NULL` pour migrations / seed.
--
-- RLS : pas de nouvelle policy. Les policies milestones_update existantes
-- (017 — admin partout, coproducer/production_manager sur leur pays)
-- couvrent déjà l'écriture. Tout user qui peut UPDATE un jalon peut
-- l'archiver / le désarchiver.
--
-- Pas d'ajout aux watched_fields de track_imported_changes : l'archivage est
-- opérationnel, pas éditorial. L'inscrire dans imported_value polluerait
-- l'audit du picto ✎.
-- ============================================================================

begin;

alter table public.milestones
  add column archived     boolean       not null default false,
  add column archived_at  timestamptz   null,
  add column archived_by  uuid          null
    references public.users(id)
    on delete set null;

create index milestones_archived_idx on public.milestones(project_id, archived);

-- ----------------------------------------------------------------------------
-- Trigger autoritatif : seul le serveur écrit archived_at / archived_by.
-- ----------------------------------------------------------------------------
create or replace function public.protect_milestone_archive_columns()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.archived = true then
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
    else
      NEW.archived_at := null;
      NEW.archived_by := null;
    end if;
    return NEW;
  end if;

  -- UPDATE : on regarde la transition.
  if NEW.archived is distinct from OLD.archived then
    if NEW.archived = true then
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
    else
      NEW.archived_at := null;
      NEW.archived_by := null;
    end if;
  else
    -- Pas de transition : on fige aux valeurs précédentes (le client ne peut
    -- pas spoofer archived_at / archived_by sans toucher à archived).
    NEW.archived_at := OLD.archived_at;
    NEW.archived_by := OLD.archived_by;
  end if;

  return NEW;
end $$;

create trigger milestones_protect_archive_columns
  before insert or update on public.milestones
  for each row execute function public.protect_milestone_archive_columns();

commit;
