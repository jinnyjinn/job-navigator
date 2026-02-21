-- Daily Quests Table
create table public.daily_quests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  category text check (category in ('study', 'cert', 'project', 'self', 'etc')),
  is_completed boolean default false,
  xp_earned integer default 0,
  time_spent_min integer default 0,
  quest_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Projects (Portfolio) Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  summary text,
  description text, -- Markdown content
  category text check (category in ('class', 'project', 'contest', 'intern', 'cert', 'volunteer')),
  tech_tags text[],
  image_urls text[],
  thumbnail_url text, -- optimized for gallery view
  github_url text,
  deploy_url text,
  start_date date,
  end_date date,
  learnings text,
  achievements text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.daily_quests enable row level security;
alter table public.projects enable row level security;

-- Policies
create policy "Users can crud own daily_quests" on public.daily_quests for all using (auth.uid() = user_id);
create policy "Users can crud own projects" on public.projects for all using (auth.uid() = user_id);
