-- Legacy staging baseline reconstructed from the project inspected on 2026-07-27.
-- On the existing staging project, mark this version as applied before using
-- `supabase db push`; do not execute it against that project.

create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.mission_status as enum (
  'draft',
  'processing',
  'completed',
  'archived'
);

create table public.clients (
  code text primary key,
  name text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on update cascade,
  created_at timestamptz not null default now(),
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  access_code text,
  email text,
  mobile text,
  telephone text,
  fax text,
  alt_email text,
  street text,
  village text,
  barangay text,
  city text,
  province text,
  region text,
  country text,
  zip_code text,
  organization text references public.clients(code),
  role public.app_role not null default 'viewer',
  updated_at timestamptz not null default now(),
  preferences jsonb not null default
    '{"theme":"light","sidebar":"expanded","language":"en","tableDensity":"comfortable"}'::jsonb
);

create table public.surveys (
  id text primary key default '',
  code text,
  area_code text,
  access_code text,
  type text,
  flight_date date,
  location text,
  area real,
  max_x double precision,
  max_y double precision,
  min_x double precision,
  min_y double precision,
  boundaries text[],
  tags text[],
  geojson_boundaries text[],
  ortho text,
  point_cloud text,
  tile_bounds_updated_at timestamp,
  tile_min_x numeric,
  tile_max_x numeric,
  tile_min_y numeric,
  tile_max_y numeric,
  organization_code text references public.clients(code),
  status public.mission_status not null default 'draft',
  created_by uuid references auth.users(id),
  category text
);

create table public.orthos (
  id text primary key,
  num_images smallint,
  gps_error real,
  tile_folder text default 'round-corners',
  survey_id text not null references public.surveys(id),
  is_current boolean not null default true,
  quality_score numeric,
  created_at timestamptz not null default now()
);

create table public.point_clouds (
  code text primary key,
  num_points integer not null,
  survey_id text references public.surveys(id),
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.surveys
  add constraint surveys_ortho_fkey
    foreign key (ortho) references public.orthos(id),
  add constraint surveys_point_cloud_fkey
    foreign key (point_cloud) references public.point_clouds(code);

create unique index one_current_ortho_per_survey
  on public.orthos(survey_id)
  where is_current;

create unique index one_current_pointcloud_per_survey
  on public.point_clouds(survey_id)
  where is_current;

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.surveys enable row level security;
alter table public.orthos enable row level security;
alter table public.point_clouds enable row level security;

