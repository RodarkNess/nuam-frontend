-- Legacy schema draft. The active application uses Django ORM migrations
-- (tables prefixed tributario_) against Supabase PostgreSQL; do not apply this
-- draft alongside the Django schema. Its RLS policies do not secure Django API
-- requests, which are authorized by the backend's JWT/RBAC permissions.

create extension if not exists pgcrypto;

create type app_role as enum ('operador', 'supervisor', 'auditor', 'administrador');
create type record_status as enum ('pendiente', 'validado', 'en_revision', 'eliminado');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null check (country in ('Chile', 'Colombia', 'Peru')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  full_name text not null,
  role app_role not null default 'operador',
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tax_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  taxpayer_rut text not null,
  issuer text not null,
  tax_year smallint not null check (tax_year between 2000 and 2100),
  country text not null check (country in ('Chile', 'Colombia', 'Peru')),
  document_type text not null,
  amount numeric(18,2),
  status record_status not null default 'pendiente',
  document_path text,
  document_hash_sha256 text check (document_hash_sha256 is null or document_hash_sha256 ~ '^[a-f0-9]{64}$'),
  deleted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tax_year, document_type, taxpayer_rut)
);

create index tax_records_lookup_idx on public.tax_records (organization_id, tax_year, issuer, country, status);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id),
  action text not null check (action in ('login', 'read', 'create', 'update', 'soft_delete', 'download', 'approve', 'reject', 'security_failure')),
  entity_type text not null,
  entity_id uuid,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_lookup_idx on public.audit_log (organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.tax_records enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.user_organization_id()
returns uuid language sql stable security definer set search_path = public
as $$ select organization_id from public.profiles where id = auth.uid() $$;

create or replace function public.user_role()
returns app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create policy "Users see own organization" on public.organizations for select
using (id = public.user_organization_id());

create policy "Users see own profile" on public.profiles for select
using (id = auth.uid());

create policy "Records scoped by organization" on public.tax_records for select
using (organization_id = public.user_organization_id() and deleted_at is null);

create policy "Operators and supervisors create records" on public.tax_records for insert
with check (organization_id = public.user_organization_id() and public.user_role() in ('operador', 'supervisor'));

create policy "Operators and supervisors update records" on public.tax_records for update
using (organization_id = public.user_organization_id() and public.user_role() in ('operador', 'supervisor'))
with check (organization_id = public.user_organization_id());

create policy "Supervisors soft delete records" on public.tax_records for update
using (organization_id = public.user_organization_id() and public.user_role() = 'supervisor');

create policy "Auditors read audit log" on public.audit_log for select
using (organization_id = public.user_organization_id() and public.user_role() in ('auditor', 'supervisor', 'administrador'));

revoke update, delete on public.audit_log from authenticated;
create policy "Append-only audit log" on public.audit_log for insert
with check (actor_id = auth.uid() and organization_id = public.user_organization_id());
