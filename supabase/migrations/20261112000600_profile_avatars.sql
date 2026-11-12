BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', false, 1048576, ARRAY['image/jpeg']);

CREATE POLICY "Read own profile avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND name = (SELECT auth.uid())::text || '/avatar.jpg'
);

CREATE POLICY "Upload own profile avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND name = (SELECT auth.uid())::text || '/avatar.jpg'
);

CREATE POLICY "Replace own profile avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND name = (SELECT auth.uid())::text || '/avatar.jpg'
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND name = (SELECT auth.uid())::text || '/avatar.jpg'
);

COMMIT;
