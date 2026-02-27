-- Cloud-Native VCS Schema
-- Runs on Supabase (Cloud PostgreSQL)

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists repositories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  owner_id uuid references profiles(id) on delete cascade not null,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists commits (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references repositories(id) on delete cascade not null,
  message text not null,
  ai_summary text,
  author_id uuid references profiles(id) not null,
  parent_commit_id uuid references commits(id),
  tree_hash text not null,
  integrity_hash text not null,
  created_at timestamptz default now()
);

create table if not exists blobs (
  hash text primary key,
  size integer not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table if not exists tree_entries (
  id uuid default gen_random_uuid() primary key,
  commit_id uuid references commits(id) on delete cascade not null,
  path text not null,
  blob_hash text references blobs(hash) not null
);

create table if not exists collaborators (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references repositories(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'editor', 'viewer')) default 'viewer',
  created_at timestamptz default now(),
  unique(repo_id, user_id)
);

-- Indexes
create index if not exists idx_commits_repo on commits(repo_id);
create index if not exists idx_tree_entries_commit on tree_entries(commit_id);
create index if not exists idx_collaborators_repo on collaborators(repo_id);
create index if not exists idx_repositories_owner on repositories(owner_id);

-- Row Level Security
alter table profiles enable row level security;
alter table repositories enable row level security;
alter table commits enable row level security;
alter table blobs enable row level security;
alter table tree_entries enable row level security;
alter table collaborators enable row level security;

create policy "Public profiles viewable" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

create policy "Public repos viewable" on repositories for select using (is_public = true or owner_id = auth.uid());
create policy "Owners manage repos" on repositories for all using (owner_id = auth.uid());

create policy "Commits viewable" on commits for select using (true);
create policy "Authors create commits" on commits for insert with check (author_id = auth.uid());

create policy "Blobs viewable" on blobs for select using (true);
create policy "Blobs insertable" on blobs for insert with check (true);

create policy "Tree entries viewable" on tree_entries for select using (true);
create policy "Tree entries insertable" on tree_entries for insert with check (true);

create policy "Collaborators viewable" on collaborators for select using (true);
create policy "Owners manage collaborators" on collaborators for all using (
  exists (select 1 from collaborators c where c.repo_id = collaborators.repo_id and c.user_id = auth.uid() and c.role = 'owner')
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
