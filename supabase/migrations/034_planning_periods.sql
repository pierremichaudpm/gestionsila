-- 034_planning_periods.sql
--
-- Intégration du planning de production SILA dans le module Calendrier/Gantt.
-- Décision d'archi (validée Pierre 2026-05-29) : OPTION 2 — extension de
-- l'existant, pas de couche parallèle. On réutilise lots (= sections/Tableaux),
-- tasks (031) et milestones. Le seul vrai manque du modèle actuel est la
-- MULTI-PÉRIODE non contiguë par tâche (ex. « Push build EN — Sep · Oct · Nov
-- · Déc · Juin »), que ni tasks (un seul due_date) ni milestones (un seul
-- [start, end]) ne savent représenter.
--
-- CE FICHIER = SCHÉMA PUR (indépendant des arbitrages métier D2/D9) :
--   1. tasks.responsable_label — fallback texte pour les responsables sans
--      compte utilisateur (décision D4 : on ne crée pas les comptes maintenant).
--   2. Index unique partiel sur tasks(project_id, external_id) — clé d'idempotence
--      pour le seed (035) : un upsert par external_id stable.
--   3. Table task_periods — 0..N périodes de travail par tâche.
--
-- Les données (lots DEV/PROMO, 76 tâches, périodes, jalons manquants) sont dans
-- la migration de seed 035, séparée pour que D2 (pays DEV/PROMO) et D9 (couleur
-- violette T-V) ne touchent que le seed.
--
-- À LANCER : Supabase → SQL Editor (comme 031/032/033).

begin;

-- ----------------------------------------------------------------------------
-- 1. tasks.responsable_label
--    Responsable affiché quand assigned_to est NULL (responsable sans compte :
--    Odran Jobin, Ismael Backes, Fireflies Studio, Agnès de Cayeux, ou un nom
--    d'org « Voulez-vous » / « Neek »). Si assigned_to est renseigné, l'UI
--    affiche le user et ignore ce label.
-- ----------------------------------------------------------------------------
alter table public.tasks
  add column if not exists responsable_label text;

-- ----------------------------------------------------------------------------
-- 1bis. lots.country devient NULLABLE — NULL = section transversale (D2).
--   Virginie (2026-05-30) : DEV transversal et Promotion regroupent tous les
--   pays. lots.country était NOT NULL char(2) ; on autorise NULL pour ces lots
--   « sans pays ». Les 5 Tableaux existants gardent leur pays. Effets : le
--   filtre Pays traite NULL comme « transversal » ; countryFlag(NULL) n'affiche
--   pas de drapeau ; LotDetail.canEditStatus (profile.country === lot.country)
--   reste false pour ces 2 lots (statut non éditable là — sans importance).
-- ----------------------------------------------------------------------------
alter table public.lots
  alter column country drop not null;

-- ----------------------------------------------------------------------------
-- 2. Idempotence du seed : un external_id unique par projet (NULL autorisé en
--    multiple — les tâches créées à la main dans l'UI n'ont pas d'external_id).
-- ----------------------------------------------------------------------------
create unique index if not exists tasks_project_external_id_uidx
  on public.tasks(project_id, external_id)
  where external_id is not null;

-- ----------------------------------------------------------------------------
-- 3. task_periods — périodes de travail d'une tâche
--    end_date NULL = période ponctuelle (un seul jour, rendu losange comme les
--    jalons ponctuels du Gantt). is_tentative = la période est « à confirmer »
--    dans la source Excel (rendu hachuré / opacité réduite). note = annotation
--    de cellule (« rework avec texte cuté », « proto », « att push finale »…).
-- ----------------------------------------------------------------------------
create table if not exists public.task_periods (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  start_date   date not null,
  end_date     date,                         -- NULL = ponctuel
  is_tentative boolean not null default false,
  note         text,
  created_at   timestamptz not null default now(),
  -- end_date, si présent, ne peut pas précéder start_date
  constraint task_periods_dates_chk check (end_date is null or end_date >= start_date)
);

create index if not exists task_periods_task_id_idx
  on public.task_periods(task_id);
create index if not exists task_periods_start_idx
  on public.task_periods(task_id, start_date);

-- ----------------------------------------------------------------------------
-- 4. RLS — alignée sur la vision collaborative ouverte de tasks (031)
--    Lecture + écriture : tout membre du projet (résolu via la tâche parente).
--    Suppression : tout membre aussi (une période n'est pas une donnée
--    sensible ; supprimer une période ≠ supprimer une tâche, qui reste admin).
--    Pas de denormalisation de project_id : on passe par EXISTS sur tasks,
--    qui porte déjà project_id + son index.
-- ----------------------------------------------------------------------------
alter table public.task_periods enable row level security;

create policy task_periods_select on public.task_periods
  for select to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_periods.task_id
        and public.is_project_member(t.project_id)
    )
  );

create policy task_periods_insert on public.task_periods
  for insert to authenticated with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_periods.task_id
        and public.is_project_member(t.project_id)
    )
  );

create policy task_periods_update on public.task_periods
  for update to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_periods.task_id
        and public.is_project_member(t.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_periods.task_id
        and public.is_project_member(t.project_id)
    )
  );

create policy task_periods_delete on public.task_periods
  for delete to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_periods.task_id
        and public.is_project_member(t.project_id)
    )
  );

commit;

-- VÉRIFICATION post-migration :
--   select column_name from information_schema.columns
--   where table_name = 'tasks' and column_name = 'responsable_label';   -- 1 ligne
--   select count(*) from public.task_periods;                            -- 0
--   \d public.task_periods   -- (ou via l'inspecteur de tables Supabase)
