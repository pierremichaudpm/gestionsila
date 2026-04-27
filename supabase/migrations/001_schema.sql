-- ============================================================================
-- SILA — schema initial (Phase 1)
-- 11 tables + RLS. Principe : lecture globale par projet, écriture filtrée par
-- country. Budget : lecture filtrée par org (hors admin), écriture admin ou
-- coproducer (own org). Contractor : tâches/documents assignés uniquement.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country char(2) not null,
  currency text not null check (currency in ('CAD', 'EUR')),
  role text not null check (role in ('producer', 'coproducer', 'contractor', 'distributor', 'funder')),
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete restrict,
  email text not null unique,
  full_name text not null,
  role text,
  country char(2) not null,
  created_at timestamptz not null default now()
);
create index users_org_id_idx on public.users(org_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  access_level text not null check (access_level in ('admin', 'coproducer', 'production_manager', 'contractor')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index project_members_project_id_idx on public.project_members(project_id);
create index project_members_user_id_idx on public.project_members(user_id);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  director text,
  country char(2) not null,
  status text not null default 'prototype' check (status in ('prototype', 'in_production', 'post_production', 'delivered')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index lots_project_id_idx on public.lots(project_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  assigned_to uuid references public.users(id) on delete set null,
  title text not null,
  phase text not null check (phase in ('dev', 'shooting', 'post', 'integration', 'delivery')),
  start_date date,
  end_date date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
  depends_on uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_lot_id_idx on public.tasks(lot_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);

-- NB : beneficiary_org_id hors spec stricte, requis par l'UX "Livrables — Vue
-- par bailleur" (affiche l'org bénéficiaire) et par le seed.
create table public.funders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  country char(2) not null,
  amount numeric(14, 2) not null,
  currency text not null check (currency in ('CAD', 'EUR')),
  status text not null default 'to_confirm' check (status in ('acquired', 'expected', 'to_confirm')),
  beneficiary_org_id uuid references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index funders_project_id_idx on public.funders(project_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  category text not null check (category in ('contract', 'scenario', 'artistic_dossier', 'report', 'technical_deliverable', 'invoice')),
  country char(2) not null,
  version int not null default 1,
  validation_status text not null default 'draft' check (validation_status in ('draft', 'pending', 'approved', 'archived')),
  drive_url text not null,
  drive_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_project_id_idx on public.documents(project_id);
create index documents_lot_id_idx on public.documents(lot_id);
create index documents_uploaded_by_idx on public.documents(uploaded_by);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null,
  org_id uuid not null references public.organizations(id) on delete restrict,
  funder_id uuid references public.funders(id) on delete set null,
  category text not null,
  planned numeric(14, 2) not null default 0,
  actual numeric(14, 2) not null default 0,
  currency text not null check (currency in ('CAD', 'EUR')),
  exchange_rate numeric(10, 6),
  created_at timestamptz not null default now()
);
create index budget_lines_project_id_idx on public.budget_lines(project_id);
create index budget_lines_org_id_idx on public.budget_lines(org_id);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  funder_id uuid not null references public.funders(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'to_produce' check (status in ('to_produce', 'in_progress', 'submitted', 'validated')),
  notes text,
  created_at timestamptz not null default now()
);
create index deliverables_funder_id_idx on public.deliverables(funder_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_project_id_idx on public.activity_log(project_id);
create index activity_log_created_at_idx on public.activity_log(created_at desc);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS HELPER FUNCTIONS (security definer : bypass RLS, évite la récursion)
-- ============================================================================

create or replace function public.current_user_country()
returns char(2)
language sql stable security definer set search_path = public
as $$
  select country from public.users where id = auth.uid();
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.users where id = auth.uid();
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.project_access_level(p_project_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select access_level from public.project_members
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.shares_project_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm_self
    join public.project_members pm_other on pm_self.project_id = pm_other.project_id
    where pm_self.user_id = auth.uid() and pm_other.user_id = p_user_id
  );
$$;

create or replace function public.lot_project_id(p_lot_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select project_id from public.lots where id = p_lot_id;
$$;

create or replace function public.lot_country(p_lot_id uuid)
returns char(2)
language sql stable security definer set search_path = public
as $$
  select country from public.lots where id = p_lot_id;
$$;

create or replace function public.funder_project_id(p_funder_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select project_id from public.funders where id = p_funder_id;
$$;

create or replace function public.funder_country(p_funder_id uuid)
returns char(2)
language sql stable security definer set search_path = public
as $$
  select country from public.funders where id = p_funder_id;
$$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

alter table public.organizations   enable row level security;
alter table public.users           enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.lots            enable row level security;
alter table public.tasks           enable row level security;
alter table public.funders         enable row level security;
alter table public.documents       enable row level security;
alter table public.budget_lines    enable row level security;
alter table public.deliverables    enable row level security;
alter table public.activity_log    enable row level security;

-- ============================================================================
-- POLICIES
-- ============================================================================

-- organizations — lecture publique authentifiée, écriture admin d'un projet
create policy organizations_select on public.organizations
  for select to authenticated using (true);

create policy organizations_insert on public.organizations
  for insert to authenticated with check (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  );

create policy organizations_update on public.organizations
  for update to authenticated
  using (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  )
  with check (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  );

create policy organizations_delete on public.organizations
  for delete to authenticated using (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  );

-- users — visible à soi-même et aux coéquipiers, modifiable par soi-même
create policy users_select on public.users
  for select to authenticated using (
    id = auth.uid() or public.shares_project_with(id)
  );

create policy users_insert on public.users
  for insert to authenticated with check (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  );

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_delete on public.users
  for delete to authenticated using (
    exists (select 1 from public.project_members
            where user_id = auth.uid() and access_level = 'admin')
  );

-- projects — lecture pour les membres, CRUD admin
create policy projects_select on public.projects
  for select to authenticated using (public.is_project_member(id));

create policy projects_insert on public.projects
  for insert to authenticated with check (true);

create policy projects_update on public.projects
  for update to authenticated
  using (public.project_access_level(id) = 'admin')
  with check (public.project_access_level(id) = 'admin');

create policy projects_delete on public.projects
  for delete to authenticated using (public.project_access_level(id) = 'admin');

-- project_members — lecture pour membres du projet, écriture admin du projet
create policy project_members_select on public.project_members
  for select to authenticated using (public.is_project_member(project_id));

create policy project_members_insert on public.project_members
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
  );

create policy project_members_update on public.project_members
  for update to authenticated
  using (public.project_access_level(project_id) = 'admin')
  with check (public.project_access_level(project_id) = 'admin');

create policy project_members_delete on public.project_members
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
  );

-- lots — lecture membres, écriture (admin|coproducer|production_manager) même pays
create policy lots_select on public.lots
  for select to authenticated using (public.is_project_member(project_id));

create policy lots_insert on public.lots
  for insert to authenticated with check (
    public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

create policy lots_update on public.lots
  for update to authenticated
  using (
    public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  )
  with check (
    public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

create policy lots_delete on public.lots
  for delete to authenticated using (
    public.project_access_level(project_id) in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

-- tasks — lecture membres (contractor voit assignées seulement), écriture non-contractor même pays que le lot
create policy tasks_select on public.tasks
  for select to authenticated using (
    assigned_to = auth.uid()
    or public.project_access_level(public.lot_project_id(lot_id))
       in ('admin', 'coproducer', 'production_manager')
  );

create policy tasks_insert on public.tasks
  for insert to authenticated with check (
    public.project_access_level(public.lot_project_id(lot_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.lot_country(lot_id) = public.current_user_country()
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.project_access_level(public.lot_project_id(lot_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.lot_country(lot_id) = public.current_user_country()
  )
  with check (
    public.project_access_level(public.lot_project_id(lot_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.lot_country(lot_id) = public.current_user_country()
  );

create policy tasks_delete on public.tasks
  for delete to authenticated using (
    public.project_access_level(public.lot_project_id(lot_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.lot_country(lot_id) = public.current_user_country()
  );

-- documents — contractor voit uniquement ce qu'il a uploadé ; autres lisent tout
create policy documents_select on public.documents
  for select to authenticated using (
    uploaded_by = auth.uid()
    or public.project_access_level(project_id)
       in ('admin', 'coproducer', 'production_manager')
  );

create policy documents_insert on public.documents
  for insert to authenticated with check (
    public.project_access_level(project_id)
      in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
    and uploaded_by = auth.uid()
  );

create policy documents_update on public.documents
  for update to authenticated
  using (
    public.project_access_level(project_id)
      in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  )
  with check (
    public.project_access_level(project_id)
      in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

create policy documents_delete on public.documents
  for delete to authenticated using (
    public.project_access_level(project_id)
      in ('admin', 'coproducer', 'production_manager')
    and country = public.current_user_country()
  );

-- funders — admin (partout) ou coproducer (même pays)
create policy funders_select on public.funders
  for select to authenticated using (public.is_project_member(project_id));

create policy funders_insert on public.funders
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );

create policy funders_update on public.funders
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );

create policy funders_delete on public.funders
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and country = public.current_user_country()
    )
  );

-- deliverables — lecture membres, écriture (admin|coproducer|production_manager) même pays que le funder
create policy deliverables_select on public.deliverables
  for select to authenticated using (
    public.is_project_member(public.funder_project_id(funder_id))
  );

create policy deliverables_insert on public.deliverables
  for insert to authenticated with check (
    public.project_access_level(public.funder_project_id(funder_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.funder_country(funder_id) = public.current_user_country()
  );

create policy deliverables_update on public.deliverables
  for update to authenticated
  using (
    public.project_access_level(public.funder_project_id(funder_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.funder_country(funder_id) = public.current_user_country()
  )
  with check (
    public.project_access_level(public.funder_project_id(funder_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.funder_country(funder_id) = public.current_user_country()
  );

create policy deliverables_delete on public.deliverables
  for delete to authenticated using (
    public.project_access_level(public.funder_project_id(funder_id))
      in ('admin', 'coproducer', 'production_manager')
    and public.funder_country(funder_id) = public.current_user_country()
  );

-- budget_lines — admin voit tout, coproducer/prod_manager voient leur org.
-- Écriture : admin ou coproducer (own org). Production_manager read-only.
create policy budget_lines_select on public.budget_lines
  for select to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) in ('coproducer', 'production_manager')
      and org_id = public.current_user_org_id()
    )
  );

create policy budget_lines_insert on public.budget_lines
  for insert to authenticated with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and org_id = public.current_user_org_id()
    )
  );

create policy budget_lines_update on public.budget_lines
  for update to authenticated
  using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and org_id = public.current_user_org_id()
    )
  )
  with check (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and org_id = public.current_user_org_id()
    )
  );

create policy budget_lines_delete on public.budget_lines
  for delete to authenticated using (
    public.project_access_level(project_id) = 'admin'
    or (
      public.project_access_level(project_id) = 'coproducer'
      and org_id = public.current_user_org_id()
    )
  );

-- activity_log — append-only : select pour membres, insert self, pas d'update/delete
create policy activity_log_select on public.activity_log
  for select to authenticated using (public.is_project_member(project_id));

create policy activity_log_insert on public.activity_log
  for insert to authenticated with check (
    public.is_project_member(project_id) and user_id = auth.uid()
  );
