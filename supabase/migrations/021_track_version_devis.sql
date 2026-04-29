-- ============================================================================
-- 021_track_version_devis.sql
--
-- Suite de la 020 : ajouter `version_devis` aux champs surveillés par le
-- trigger track_imported_changes() sur producer_documents. Sans ça, une
-- modification de la version du devis sur une fiche importée ne serait
-- pas tracée dans imported_value.
--
-- (La 020 a ajouté la colonne mais n'a pas touché à la fonction trigger.
-- On amende ici plutôt que dans 020 puisque 020 est déjà appliquée en prod.)
-- ============================================================================

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
