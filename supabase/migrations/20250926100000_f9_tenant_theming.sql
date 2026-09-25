-- F9-R6/R8: per-tenant logo + background gradient theming.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_path TEXT,
  ADD COLUMN IF NOT EXISTS bg_gradient_from TEXT,
  ADD COLUMN IF NOT EXISTS bg_gradient_via TEXT,
  ADD COLUMN IF NOT EXISTS bg_gradient_to TEXT;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_bg_gradient_from_hex
    CHECK (bg_gradient_from IS NULL OR bg_gradient_from ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT tenants_bg_gradient_via_hex
    CHECK (bg_gradient_via IS NULL OR bg_gradient_via ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT tenants_bg_gradient_to_hex
    CHECK (bg_gradient_to IS NULL OR bg_gradient_to ~ '^#[0-9a-fA-F]{6}$');

-- Storage bucket for tenant logos (public read, admin-only write scoped to
-- the tenant's own folder — objects are stored at "<tenant_id>/<filename>").
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-logos', 'tenant-logos', true, 1048576, ARRAY['image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tenant-logos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "tenant-logos admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON r.id = m.role_id
        WHERE m.user_id = auth.uid()
          AND r.name = 'admin'
          AND m.tenant_id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "tenant-logos admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON r.id = m.role_id
        WHERE m.user_id = auth.uid()
          AND r.name = 'admin'
          AND m.tenant_id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "tenant-logos admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-logos'
    AND (
      public.is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.roles r ON r.id = m.role_id
        WHERE m.user_id = auth.uid()
          AND r.name = 'admin'
          AND m.tenant_id::text = (storage.foldername(name))[1]
      )
    )
  );
