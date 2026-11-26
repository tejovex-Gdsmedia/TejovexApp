-- Face embeddings table for SCRFD + ArcFace recognition
create table if not exists face_embeddings (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  embedding float8[] not null,  -- 512-element ArcFace vector
  enrolled_at timestamptz default now()
);

-- Only the user themselves and service role can read/write
alter table face_embeddings enable row level security;

create policy "users can read own embedding"
  on face_embeddings for select
  using (auth.uid() = user_id);

-- Writes come from the Python server using the service role key (bypasses RLS)
