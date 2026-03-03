-- Migration: Create memo-images storage bucket
-- Run this in Supabase SQL editor

-- Create the storage bucket for memo images
INSERT INTO storage.buckets (id, name, public)
VALUES ('memo-images', 'memo-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload memo images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'memo-images');

-- Allow public read access
CREATE POLICY "Public read access for memo images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'memo-images');

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete own memo images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'memo-images');
