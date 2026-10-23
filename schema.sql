-- FoodShare starter schema
-- The browser never uses the service-role key. Keep that key in Render environment variables only.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'recipient'
    check (role in ('donor', 'recipient', 'admin')),
  organization_name text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles(id) on delete set null,
  food_name text not null check (char_length(food_name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'Other' check (char_length(category) <= 60),
  quantity text not null check (char_length(quantity) between 1 and 100),
  location text not null check (char_length(location) between 1 and 180),
  donor_contact text not null check (char_length(donor_contact) between 1 and 180),
  vegetarian boolean not null default false,
  expires_at timestamptz,
  status text not null default 'available'
    check (status in ('available', 'withdrawn', 'collected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donations_available_expiry_idx
  on public.donations (status, expires_at, created_at desc);

create table if not exists public.food_requests (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  requester_name text not null check (char_length(requester_name) between 1 and 100),
  requester_contact text not null check (char_length(requester_contact) between 1 and 180),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'collected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.food_requests(id) on delete cascade,
  collected_at timestamptz not null default now(),
  notes text not null default '' check (char_length(notes) <= 500)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references public.donations(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_contact text,
  details text not null check (char_length(details) between 1 and 1500),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.donations enable row level security;
alter table public.food_requests enable row level security;
alter table public.collection_records enable row level security;
alter table public.reports enable row level security;
alter table public.contact_messages enable row level security;

-- No anonymous table policies are created. The API accesses these tables using
-- the server-side service-role key and returns only public donation fields.
