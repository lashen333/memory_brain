Supabase SQL Schema

-- Step 1: pgvector extension enable
create extension if not exists vector;

-- Step 2: Users table (Supabase auth.users extend)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Step 3: Collections (personal vault folders)
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#7F77DD',
  created_at timestamptz not null default now()
);

-- Step 4: Projects (work vault)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#378ADD',
  owner_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

-- Step 5: Project members (invite system)
create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Step 6: Memories (core table)
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  url text,
  source_title text,
  vault_type text not null check (vault_type in ('personal', 'work')),
  collection_id uuid references public.collections(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Step 7: Connections (knowledge graph edges)
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references public.memories(id) on delete cascade not null,
  to_id uuid references public.memories(id) on delete cascade not null,
  strength float not null check (strength >= 0 and strength <= 1),
  created_at timestamptz not null default now(),
  unique(from_id, to_id)
);

-- Step 8: Reminders
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.memories(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  trigger_at timestamptz not null,
  intent text not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------------------------------
Indexes (Performance)

-- Vector similarity search fast කරන්න (HNSW index)
create index memories_embedding_idx
  on public.memories
  using hnsw (embedding vector_cosine_ops);

-- User memories fast fetch
create index memories_user_id_idx
  on public.memories(user_id);

-- Timeline view (newest first)
create index memories_created_at_idx
  on public.memories(created_at desc);

-- Project memories fetch
create index memories_project_id_idx
  on public.memories(project_id)
  where project_id is not null;

-- Reminders pending fetch
create index reminders_trigger_at_idx
  on public.reminders(trigger_at)
  where sent = false;

  //HNSW = faster queries, better accuracy. Industry standard choice.


  ------------------------------------------------------------------------------------------------

  RLS Policies (Security Critical)
  -- ═══════════════════════════════════
-- PART 1: ENABLE RLS
-- ═══════════════════════════════════

alter table public.users enable row level security;
alter table public.collections enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.memories enable row level security;
alter table public.connections enable row level security;
alter table public.reminders enable row level security;

-- ═══════════════════════════════════
-- PART 2: USERS POLICY
-- ═══════════════════════════════════

create policy "users_own_row"
  on public.users for all
  using (auth.uid() = id);

-- ═══════════════════════════════════
-- PART 3: COLLECTIONS POLICIES
-- ═══════════════════════════════════

create policy "collections_own"
  on public.collections for all
  using (auth.uid() = user_id);

-- ═══════════════════════════════════
-- PART 4: PROJECTS POLICIES
-- (separate policy per operation — syntax rule)
-- ═══════════════════════════════════

create policy "projects_select"
  on public.projects for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.project_members
      where project_id = projects.id
      and user_id = auth.uid()
    )
  );

create policy "projects_insert"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "projects_update"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "projects_delete"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ═══════════════════════════════════
-- PART 5: PROJECT MEMBERS POLICIES
-- ═══════════════════════════════════

create policy "project_members_select"
  on public.project_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects
      where id = project_members.project_id
      and owner_id = auth.uid()
    )
  );

create policy "project_members_insert"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.projects
      where id = project_members.project_id
      and owner_id = auth.uid()
    )
  );

create policy "project_members_delete"
  on public.project_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects
      where id = project_members.project_id
      and owner_id = auth.uid()
    )
  );

-- ═══════════════════════════════════
-- PART 6: MEMORIES POLICIES
-- ═══════════════════════════════════

create policy "memories_select"
  on public.memories for select
  using (
    (vault_type = 'personal' and auth.uid() = user_id)
    or
    (vault_type = 'work' and exists (
      select 1 from public.project_members
      where project_id = memories.project_id
      and user_id = auth.uid()
    ))
  );

create policy "memories_insert"
  on public.memories for insert
  with check (auth.uid() = user_id);

create policy "memories_update"
  on public.memories for update
  using (auth.uid() = user_id);

create policy "memories_delete"
  on public.memories for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════
-- PART 7: CONNECTIONS POLICIES
-- ═══════════════════════════════════

create policy "connections_select"
  on public.connections for select
  using (
    exists (
      select 1 from public.memories
      where id = connections.from_id
      and (
        (vault_type = 'personal' and auth.uid() = user_id)
        or
        (vault_type = 'work' and exists (
          select 1 from public.project_members
          where project_id = memories.project_id
          and user_id = auth.uid()
        ))
      )
    )
  );

create policy "connections_insert"
  on public.connections for insert
  with check (
    exists (
      select 1 from public.memories
      where id = connections.from_id
      and auth.uid() = user_id
    )
  );

-- ═══════════════════════════════════
-- PART 8: REMINDERS POLICIES
-- ═══════════════════════════════════

create policy "reminders_select"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "reminders_insert"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "reminders_update"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "reminders_delete"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════
-- PART 9: AUTO USER CREATE TRIGGER
-- (Step 6 — also runs here in Supabase)
-- ═══════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();