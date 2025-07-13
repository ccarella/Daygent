-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  true, -- Public bucket for avatars
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for user-uploads bucket
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND name LIKE 'avatars/%'
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND name LIKE 'avatars/%'
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND name LIKE 'avatars/%'
  );

CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-uploads' 
    AND name LIKE 'avatars/%'
  );