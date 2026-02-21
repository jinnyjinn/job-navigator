-- Create activity_logs table
create table activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  activity_type text not null check (activity_type in ('login', 'quest_completion', 'code_commit', 'daily_challenge')),
  xp_earned integer not null default 0,
  details jsonb, -- For storing extra info like quest_id
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table activity_logs enable row level security;

-- Policies
create policy "Users can view their own activity logs"
  on activity_logs for select
  using (auth.uid() = user_id);

-- Only system/server functions should insert activity logs ideally, 
-- but for MVP client-side actions might need insert permission with strict checks.
-- Better approach: Use a Database Function/RPC to "complete_quest" which inserts log + updates profile XP.
-- For now, let's allow insert if user owns it (be careful of cheating in prod).
create policy "Users can insert their own activity logs"
  on activity_logs for insert
  with check (auth.uid() = user_id);

-- Function to update profile XP when activity log is inserted
create or replace function public.handle_xp_update()
returns trigger as $$
begin
  update profiles
  set 
    total_xp = total_xp + new.xp_earned,
    last_active_date = new.created_at
  where id = new.user_id;
  
  -- Level calculation could happen here or in UI.
  -- Let's stick to simple total_xp update for now.
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for XP update
create trigger on_activity_log_created
  after insert on activity_logs
  for each row execute procedure public.handle_xp_update();
