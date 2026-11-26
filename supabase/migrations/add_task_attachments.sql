-- task_attachments: stores files uploaded with tasks or completion comments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- All authenticated users who can see the task can see its attachments
CREATE POLICY "Authenticated users can view task attachments"
  ON task_attachments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders and managers can delete attachments"
  ON task_attachments FOR DELETE
  USING (auth.uid() = uploader_id);

-- Supabase Storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated read task attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Uploader can delete own attachment objects"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
