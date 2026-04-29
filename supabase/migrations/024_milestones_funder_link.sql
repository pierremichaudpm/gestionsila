-- ============================================================================
-- 024_milestones_funder_link.sql
--
-- Ajoute un lien optionnel `funder_id` sur la table `milestones` pour permettre
-- de regrouper les jalons par bailleur dans la nouvelle vue Gantt du calendrier.
--
-- Décision (2026-04-29, après revue avec Virginie / Pierre) :
--   - Les 16 jalons importés via 007 sont tous des jalons internes de
--     production du Tableau IV — aucun n'est un dépôt à un bailleur.
--   - Conséquence : la nouvelle colonne reste NULL sur toutes les lignes
--     existantes. Aucun backfill nécessaire.
--   - Les futurs jalons de type `depot_fonds` recevront un funder_id via le
--     nouveau select dans NewMilestoneModal / EditMilestoneModal.
--
-- ON DELETE SET NULL : si un bailleur est supprimé, on ne perd pas le jalon,
-- il bascule simplement vers la swimlane "Production interne".
-- ============================================================================

begin;

alter table public.milestones
  add column funder_id uuid null
    references public.funders(id)
    on delete set null;

create index milestones_funder_id_idx on public.milestones(funder_id);

-- Le trigger track_imported_changes (cf. 018, 019, 021) doit aussi surveiller
-- ce nouveau champ, sinon une modification du bailleur sur un jalon importé
-- ne serait pas inscrite dans imported_value.
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
      watched_fields := array['title', 'start_date', 'end_date', 'type', 'country', 'lot_id', 'notes', 'funder_id'];
    when 'budget_lines' then
      watched_fields := array['code', 'category', 'planned', 'actual', 'currency', 'lot_id', 'cost_origin', 'org_id'];
    when 'funding_sources' then
      watched_fields := array['country', 'source_name', 'amount_eur', 'amount_cad', 'status', 'notes'];
    when 'documents' then
      watched_fields := array['title', 'drive_url', 'folder', 'category', 'version', 'lot_id', 'country', 'validation_status'];
    when 'producer_documents' then
      watched_fields := array['title', 'drive_url', 'folder', 'version', 'version_devis', 'lot_id', 'country', 'validation_status'];
    else
      return NEW;
  end case;

  updated_imported_value := COALESCE(OLD.imported_value, '{}'::jsonb);

  if OLD.imported = true then
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
    foreach field in array watched_fields loop
      old_value := to_jsonb(OLD) -> field;
      new_value := to_jsonb(NEW) -> field;
      if old_value is distinct from new_value then
        changed := true;
        exit;
      end if;
    end loop;
  end if;

  -- Toujours autoritatif côté serveur (cf. 019 H3)
  NEW.imported := OLD.imported;
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

commit;
