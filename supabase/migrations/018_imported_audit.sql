-- ============================================================================
-- 018_imported_audit.sql
--
-- PARTIE A (commit 3) — traçabilité des modifications post-import.
--
-- Ajoute 4 colonnes d'audit sur les tables qui reçoivent des imports en lot
-- (échéancier, budget Canada, structure financière) :
--
--   imported          (bool, default false)         — vrai si la ligne vient
--                                                     d'une migration de seed
--                                                     (007 / 010), pas créée
--                                                     via l'UI.
--   imported_value    (jsonb, nullable)             — snapshot des valeurs
--                                                     d'origine pour les
--                                                     champs modifiés
--                                                     post-import. Une seule
--                                                     entrée par champ : la
--                                                     valeur capturée à la
--                                                     PREMIÈRE modification.
--   last_modified_by  (uuid → users)                — auteur du dernier
--                                                     changement significatif.
--   last_modified_at  (timestamptz)                 — timestamp de ce
--                                                     changement.
--
-- producer_documents reçoit aussi ces colonnes pour symétrie (futurs imports
-- de polices d'assurance ou contrats en lot).
--
-- Le trigger track_imported_changes (BEFORE UPDATE) :
--   - Ne capture imported_value que pour les lignes imported = true.
--   - Préserve la valeur d'origine : si un champ a déjà été modifié une fois
--     et a une entrée dans imported_value, les modifs suivantes sur ce même
--     champ ne l'écrasent pas (on garde la valeur d'origine de l'import).
--   - Met à jour last_modified_by/at sur tout changement de champ surveillé,
--     y compris pour les lignes non importées (utile pour afficher un
--     historique léger côté UI, même si imported_value reste null).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonnes d'audit
-- ----------------------------------------------------------------------------
alter table public.milestones
  add column imported          boolean not null default false,
  add column imported_value    jsonb,
  add column last_modified_by  uuid references public.users(id) on delete set null,
  add column last_modified_at  timestamptz;

alter table public.budget_lines
  add column imported          boolean not null default false,
  add column imported_value    jsonb,
  add column last_modified_by  uuid references public.users(id) on delete set null,
  add column last_modified_at  timestamptz;

alter table public.funding_sources
  add column imported          boolean not null default false,
  add column imported_value    jsonb,
  add column last_modified_by  uuid references public.users(id) on delete set null,
  add column last_modified_at  timestamptz;

alter table public.documents
  add column imported          boolean not null default false,
  add column imported_value    jsonb,
  add column last_modified_by  uuid references public.users(id) on delete set null,
  add column last_modified_at  timestamptz;

alter table public.producer_documents
  add column imported          boolean not null default false,
  add column imported_value    jsonb,
  add column last_modified_by  uuid references public.users(id) on delete set null,
  add column last_modified_at  timestamptz;

-- ----------------------------------------------------------------------------
-- 2. Fonction trigger générique
-- ----------------------------------------------------------------------------
create or replace function public.track_imported_changes()
returns trigger
language plpgsql
as $$
declare
  watched_fields           text[];
  field                    text;
  old_value                jsonb;
  new_value                jsonb;
  updated_imported_value   jsonb;
  changed                  boolean := false;
begin
  case TG_TABLE_NAME
    when 'milestones' then
      watched_fields := array['title', 'start_date', 'end_date', 'type', 'country', 'lot_id', 'notes'];
    when 'budget_lines' then
      watched_fields := array['code', 'category', 'planned', 'actual', 'currency', 'lot_id', 'cost_origin', 'org_id'];
    when 'funding_sources' then
      watched_fields := array['country', 'source_name', 'amount_eur', 'amount_cad', 'status', 'notes'];
    when 'documents' then
      watched_fields := array['title', 'drive_url', 'folder', 'category', 'version', 'lot_id', 'country', 'validation_status'];
    when 'producer_documents' then
      watched_fields := array['title', 'drive_url', 'folder', 'version', 'lot_id', 'country', 'validation_status'];
    else
      return NEW;
  end case;

  updated_imported_value := COALESCE(OLD.imported_value, '{}'::jsonb);

  if OLD.imported = true then
    -- Ligne importée : on capture la valeur d'origine au premier changement
    -- de chaque champ surveillé.
    foreach field in array watched_fields loop
      old_value := to_jsonb(OLD) -> field;
      new_value := to_jsonb(NEW) -> field;
      if old_value is distinct from new_value then
        changed := true;
        if not (updated_imported_value ? field) then
          updated_imported_value := updated_imported_value || jsonb_build_object(field, old_value);
        end if;
      end if;
    end loop;
  else
    -- Ligne non importée : on track juste qu'il y a eu changement.
    foreach field in array watched_fields loop
      old_value := to_jsonb(OLD) -> field;
      new_value := to_jsonb(NEW) -> field;
      if old_value is distinct from new_value then
        changed := true;
        exit;
      end if;
    end loop;
  end if;

  -- Toujours autoritatif côté serveur : ignore toute valeur que le client
  -- aurait tenté de mettre dans imported_value / last_modified_*.
  NEW.imported_value := updated_imported_value;
  if changed then
    NEW.last_modified_by := auth.uid();
    NEW.last_modified_at := now();
  else
    NEW.last_modified_by := OLD.last_modified_by;
    NEW.last_modified_at := OLD.last_modified_at;
  end if;

  return NEW;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Triggers BEFORE UPDATE — un par table
-- ----------------------------------------------------------------------------
create trigger milestones_track_changes
  before update on public.milestones
  for each row execute function public.track_imported_changes();

create trigger budget_lines_track_changes
  before update on public.budget_lines
  for each row execute function public.track_imported_changes();

create trigger funding_sources_track_changes
  before update on public.funding_sources
  for each row execute function public.track_imported_changes();

create trigger documents_track_changes
  before update on public.documents
  for each row execute function public.track_imported_changes();

create trigger producer_documents_track_changes
  before update on public.producer_documents
  for each row execute function public.track_imported_changes();

-- ----------------------------------------------------------------------------
-- 4. Backfill imported = true sur les lignes issues de migrations
-- ----------------------------------------------------------------------------
-- milestones de 007 (échéancier SILA — IDs 77...0101 à 0116) :
update public.milestones
   set imported = true
 where id::text like '77777777-0000-0000-0000-0000000001%';

-- budget_lines de 010 (devis SODEC JAXA — IDs 66...CA0000000001 à 0019) :
update public.budget_lines
   set imported = true
 where id::text like '66666666-0000-0000-0000-CA00000000%';

-- funding_sources de 010 (CSV structure financière — IDs 99...0001 à 0022) :
update public.funding_sources
   set imported = true
 where id::text like '99999999-0000-0000-0000-0000000000%';

-- documents et producer_documents : aucun import à ce stade (tables vides).
-- Les colonnes restent à false par défaut pour toute future création UI.
