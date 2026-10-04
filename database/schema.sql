-- Fresh, self-hosted PostgreSQL schema for AUP Work Scholars.
-- Run this once against the new database as its owner.

create extension if not exists pgcrypto;

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  bio text not null default '',
  avatar_path text,
  cover_path text,
  role text not null default 'student' check (role in ('student', 'supervisor', 'admin')),
  department_id uuid references departments(id) on delete set null,
  student_id text,
  work_assignment text,
  hourly_rate numeric(8,2) not null default 0 check (hourly_rate >= 0),
  school_tuition_balance numeric(10,2) not null default 0,
  financials_started_at timestamptz not null default now(),
  personal_wallet_opening_balance numeric(10,2) not null default 0 check (personal_wallet_opening_balance >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_department_idx on profiles(department_id);
create index profiles_role_idx on profiles(role);
create unique index profiles_student_id_idx on profiles(student_id) where student_id is not null and student_id <> '';

create table sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_profile_idx on sessions(profile_id);
create index sessions_expiry_idx on sessions(expires_at);

create table time_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  time_in timestamptz not null default now(),
  time_out timestamptz,
  earning_rate numeric(8,2),
  note text,
  overridden_by uuid references profiles(id) on delete set null,
  override_reason text,
  created_at timestamptz not null default now(),
  constraint time_out_after_in check (time_out is null or time_out >= time_in)
);
create index time_logs_student_idx on time_logs(student_id, time_in desc);
create unique index time_logs_one_open_per_student on time_logs(student_id) where time_out is null;

create table schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now(),
  constraint schedule_end_after_start check (end_time > start_time)
);
create index schedules_student_idx on schedules(student_id);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  legacy_wallet_settled boolean not null default false
);
create index payouts_student_idx on payouts(student_id, paid_at desc);

create table wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  note text,
  allocated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);
create index wallet_transfers_student_idx on wallet_transfers(student_id, allocated_at desc);

create or replace function capture_time_log_earning_rate()
returns trigger language plpgsql as $$
begin
  if new.time_out is not null and new.earning_rate is null then
    select hourly_rate into new.earning_rate from profiles where id = new.student_id;
  end if;
  return new;
end;
$$;
create trigger time_logs_capture_earning_rate
  before insert or update on time_logs
  for each row execute function capture_time_log_earning_rate();
