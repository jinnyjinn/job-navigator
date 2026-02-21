-- D-Day Events Table
-- user_id references auth.users(id) because profiles.id might be bigint
create table public.dday_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  event_date date not null,
  emoji text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Roadmaps Table
create table public.roadmaps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  grade integer not null check (grade in (1, 2, 3)),
  title text not null,
  description text,
  target_date date,
  status text not null default 'prep' check (status in ('prep', 'ing', 'done')),
  skill_tags text[],
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.dday_events enable row level security;
alter table public.roadmaps enable row level security;

-- Policies for dday_events
create policy "Users can crud own dday_events"
  on public.dday_events for all
  using (auth.uid() = user_id);

-- Policies for roadmaps
create policy "Users can crud own roadmaps"
  on public.roadmaps for all
  using (auth.uid() = user_id);
