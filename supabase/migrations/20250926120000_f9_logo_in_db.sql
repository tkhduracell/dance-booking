-- F9-R6: store tenant logo bytes directly in the DB instead of Supabase
-- Storage. Drops logo_path and the tenant-logos bucket/policies.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_data BYTEA,
  ADD COLUMN IF NOT EXISTS logo_mime TEXT,
  ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMPTZ;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_logo_mime_check
    CHECK (logo_mime IS NULL OR logo_mime IN ('image/png', 'image/webp'));

ALTER TABLE public.tenants DROP COLUMN IF EXISTS logo_path;

DROP POLICY IF EXISTS "tenant-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "tenant-logos admin write" ON storage.objects;
DROP POLICY IF EXISTS "tenant-logos admin update" ON storage.objects;
DROP POLICY IF EXISTS "tenant-logos admin delete" ON storage.objects;

-- Note: the storage API (not raw SQL) owns storage.buckets/objects rows, so
-- direct DELETE is rejected by Supabase's protections. The `tenant-logos`
-- bucket is left in place (empty, unused, unreachable now that its RLS
-- policies are gone) rather than fighting that restriction here.
