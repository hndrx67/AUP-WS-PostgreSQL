alter table profiles
  add column if not exists temporary_credentials boolean not null default false;
