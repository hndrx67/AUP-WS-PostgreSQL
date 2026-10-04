create table if not exists server_monitor_state (
  singleton boolean primary key default true check (singleton),
  last_check_at timestamptz not null,
  process_started_at timestamptz not null
);

create table if not exists server_downtimes (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  detected_at timestamptz not null default now()
);
create index if not exists server_downtimes_detected_idx on server_downtimes(detected_at desc);
