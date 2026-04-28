-- ============================================================================
-- 013_currency_rates_history.sql
--
-- PARTIE B (commit 1) — Fondations devises pour le double affichage CAD/EUR.
--
-- 1. Ajout du taux inverse CAD→EUR sur project_settings. Les deux taux sont
--    INDÉPENDANTS (pas calculés l'un de l'autre), conformément au devis SILA :
--      - 1 EUR = 1.6135 CAD
--      - 1 CAD = 0.6198 EUR
--    Note : 1/1.6135 = 0.61977… qui s'arrondit à 0.6198 ; les deux valeurs
--    coexistent sans qu'on impose la réciprocité.
--
-- 2. Table exchange_rate_history pour tracer les modifications. Auto-alimentée
--    par un trigger AFTER UPDATE sur project_settings.
-- ============================================================================

-- 1. Colonne taux inverse + valeur initiale pour SILA
alter table public.project_settings
  add column exchange_rate_cad_to_eur numeric(10, 6);

update public.project_settings
   set exchange_rate_cad_to_eur = 0.6198
 where project_id = '11111111-1111-1111-1111-111111111111';

-- 2. Historique des changements de taux
create table public.exchange_rate_history (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  rate_eur_to_cad numeric(10, 6),
  rate_cad_to_eur numeric(10, 6),
  effective_date  date,
  set_by_user_id  uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index exchange_rate_history_project_idx
  on public.exchange_rate_history(project_id, created_at desc);

alter table public.exchange_rate_history enable row level security;

-- Lecture : membres du projet (le taux est utile aux producers ET aux
-- équipes de production qui consultent les budgets)
create policy exchange_rate_history_select on public.exchange_rate_history
  for select to authenticated using (public.is_project_member(project_id));

-- Insertion : admin only, et set_by_user_id doit être l'utilisateur courant
create policy exchange_rate_history_insert on public.exchange_rate_history
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    and set_by_user_id = auth.uid()
  );

-- Pas d'UPDATE / DELETE — append-only.

-- 3. Trigger : à chaque mise à jour des taux dans project_settings, journaliser.
create or replace function public.log_exchange_rate_change()
returns trigger
language plpgsql
as $$
begin
  if (NEW.exchange_rate_eur_to_cad is distinct from OLD.exchange_rate_eur_to_cad)
     or (NEW.exchange_rate_cad_to_eur is distinct from OLD.exchange_rate_cad_to_eur) then
    if auth.uid() is not null then
      insert into public.exchange_rate_history
        (project_id, rate_eur_to_cad, rate_cad_to_eur, effective_date, set_by_user_id)
      values
        (NEW.project_id, NEW.exchange_rate_eur_to_cad, NEW.exchange_rate_cad_to_eur,
         coalesce(NEW.exchange_rate_date, current_date), auth.uid());
    end if;
  end if;
  return NEW;
end $$;

create trigger project_settings_log_rate_change
  after update on public.project_settings
  for each row execute function public.log_exchange_rate_change();

-- 4. Entrée initiale dans l'historique (les taux étaient déjà fixés avant
--    cette migration, à transposer pour ne pas perdre l'ancrage).
insert into public.exchange_rate_history
  (project_id, rate_eur_to_cad, rate_cad_to_eur, effective_date, set_by_user_id)
values
  ('11111111-1111-1111-1111-111111111111', 1.6135, 0.6198, '2025-10-10',
   '33333333-0000-0000-0000-000000000001'); -- Virginie
