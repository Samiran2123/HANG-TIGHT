-- ============================================================================
-- 004_storage_and_admin_helpers.sql
-- Storage configuration & administrative privilege helpers
-- ============================================================================

-- 1. Storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to read images from public bucket
DROP POLICY IF EXISTS "Public food images access" ON storage.objects;
CREATE POLICY "Public food images access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images');

-- Policy to allow only admins to upload/modify food images
DROP POLICY IF EXISTS "Admins can upload food images" ON storage.objects;
CREATE POLICY "Admins can upload food images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'food-images' 
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update food images" ON storage.objects;
CREATE POLICY "Admins can update food images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'food-images' 
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete food images" ON storage.objects;
CREATE POLICY "Admins can delete food images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'food-images' 
    AND public.is_admin()
  );

-- 2. Helper procedure to safely promote a user to admin by email (Run from SQL Editor)
CREATE OR REPLACE FUNCTION public.set_admin_role_by_email(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT id INTO found_user_id FROM public.profiles WHERE LOWER(email) = LOWER(target_email);
  IF found_user_id IS NULL THEN
    RETURN 'Error: User profile with email ' || target_email || ' not found. User must register first.';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = timezone('utc'::text, now())
  WHERE id = found_user_id;

  RETURN 'Success: User ' || target_email || ' has been granted Admin role.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

ALTER FUNCTION public.set_admin_role_by_email(TEXT) OWNER TO postgres;

-- Revoke public execution to prevent unauthorized privilege escalation via Supabase RPC
REVOKE ALL ON FUNCTION public.set_admin_role_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_admin_role_by_email(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_role_by_email(TEXT) TO service_role;

