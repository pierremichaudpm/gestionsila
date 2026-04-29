-- ============================================================================
-- 019_security_hardening.sql
--
-- Audit sécurité pré-prod (2026-04-29). Quatre corrections :
--
-- C1/C2 : un user non-admin pouvait PATCH son propre `users.country`,
--         `org_id` ou `email` via PostgREST direct (la policy
--         users_update_self ne contrôlait que `id = auth.uid()`).
--         Conséquence : escalation horizontale — un coproducer FR pouvait
--         se mettre `country=CA` puis modifier les données canadiennes.
--
-- H1    : sur UPDATE de documents / producer_documents, `uploaded_by`
--         n'était pas figé — un user pouvait réattribuer un document à
--         quelqu'un d'autre, brouillant la traçabilité du dépôt.
--
-- H2    : les colonnes audit (imported, imported_value, last_modified_by,
--         last_modified_at) n'avaient de protection serveur qu'au UPDATE
--         (trigger track_imported_changes). À l'INSERT, le client pouvait
--         spoofer ces valeurs (faux "ligne importée modifiée par X").
--
-- H3    : track_imported_changes ne réinitialisait pas NEW.imported.
--         Un user pouvait PATCH `{imported: false, ...}` sur une ligne
--         importée pour casser la capture de imported_value au tour suivant.
--
-- Stratégie : triggers BEFORE qui forcent les valeurs autoritatives serveur,
-- avec un échappatoire `auth.uid() IS NULL` pour les migrations et le seed
-- (qui s'exécutent sans contexte utilisateur authentifié).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- C1/C2 — verrouille country, org_id, email sur public.users
-- ----------------------------------------------------------------------------
create or replace function public.protect_user_columns()
returns trigger
language plpgsql
as $$
begin
  -- Admin de projet : peut tout modifier (cohérent avec users_update_admin
  -- ajoutée en 014). Empêche le lockout self-inflicted éventuel.
  if exists (
    select 1 from public.project_members
     where user_id = auth.uid() and access_level = 'admin'
  ) then
    return NEW;
  end if;

  -- Sinon (auto-édition non-admin, ou contexte sans auth.uid) :
  -- figer les colonnes sensibles à leurs valeurs précédentes.
  NEW.country := OLD.country;
  NEW.org_id  := OLD.org_id;
  NEW.email   := OLD.email;
  return NEW;
end $$;

create trigger users_protect_columns
  before update on public.users
  for each row execute function public.protect_user_columns();

-- ----------------------------------------------------------------------------
-- H1 — fige uploaded_by sur UPDATE de documents et producer_documents
-- ----------------------------------------------------------------------------
create or replace function public.freeze_uploaded_by()
returns trigger
language plpgsql
as $$
begin
  NEW.uploaded_by := OLD.uploaded_by;
  return NEW;
end $$;

create trigger documents_freeze_uploaded_by
  before update on public.documents
  for each row execute function public.freeze_uploaded_by();

create trigger producer_documents_freeze_uploaded_by
  before update on public.producer_documents
  for each row execute function public.freeze_uploaded_by();

-- ----------------------------------------------------------------------------
-- H2 — réinitialise les colonnes audit à l'INSERT pour les requêtes
--      authentifiées. Les migrations et le seed s'exécutent sans auth.uid()
--      et bypassent ce reset (permet d'INSERT avec imported=true côté seed).
-- ----------------------------------------------------------------------------
create or replace function public.reset_audit_columns_on_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    NEW.imported         := false;
    NEW.imported_value   := null;
    NEW.last_modified_by := null;
    NEW.last_modified_at := null;
  end if;
  return NEW;
end $$;

create trigger milestones_reset_audit_on_insert
  before insert on public.milestones
  for each row execute function public.reset_audit_columns_on_insert();

create trigger budget_lines_reset_audit_on_insert
  before insert on public.budget_lines
  for each row execute function public.reset_audit_columns_on_insert();

create trigger funding_sources_reset_audit_on_insert
  before insert on public.funding_sources
  for each row execute function public.reset_audit_columns_on_insert();

create trigger documents_reset_audit_on_insert
  before insert on public.documents
  for each row execute function public.reset_audit_columns_on_insert();

create trigger producer_documents_reset_audit_on_insert
  before insert on public.producer_documents
  for each row execute function public.reset_audit_columns_on_insert();

-- ----------------------------------------------------------------------------
-- H3 — empêche le toggle de NEW.imported par le client. Le drapeau imported
--      est désormais autoritatif serveur, comme imported_value et
--      last_modified_*.
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

  -- H3 fix : NEW.imported autoritatif côté serveur (le client ne peut pas
  -- le toggle pour échapper au tracking).
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
