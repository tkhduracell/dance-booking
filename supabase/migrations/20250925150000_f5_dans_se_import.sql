-- ============================================================
-- F5 dans.se import: token storage, imported courses/occasions, conflicts
-- ============================================================

-- F9-R11: dans.se API token, encrypted like SMTP password.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS dans_se_token_enc BYTEA,
  ADD COLUMN IF NOT EXISTS dans_se_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dans_se_last_sync_error TEXT;

-- ---------- Imported courses ----------
CREATE TABLE IF NOT EXISTS public.imported_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dans_se_id TEXT NOT NULL,
  dans_se_key TEXT,
  name TEXT NOT NULL,
  category TEXT,
  place TEXT,
  instructors TEXT,
  source_url TEXT,
  schedule_text TEXT,
  removed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dans_se_id)
);
ALTER TABLE public.imported_courses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_imported_courses_tenant_id ON public.imported_courses(tenant_id);

CREATE POLICY "Tenant members can read imported_courses"
  ON public.imported_courses FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

-- Writes happen server-side via the service-role client (sync job), so no
-- INSERT/UPDATE policy for regular users (F5-R6: read-only in the app).

-- ---------- Imported occasions ----------
CREATE TABLE IF NOT EXISTS public.imported_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.imported_courses(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.imported_occasions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_imported_occasions_tenant_id ON public.imported_occasions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imported_occasions_course_id ON public.imported_occasions(course_id);

CREATE POLICY "Tenant members can read imported_occasions"
  ON public.imported_occasions FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

-- F4-R10: conflict flag references an imported occasion.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_conflict_occasion_fk
  FOREIGN KEY (conflict_occasion_id) REFERENCES public.imported_occasions(id) ON DELETE SET NULL;

-- F9-R2/R7: extend the superadmin status view with dans.se sync status.
CREATE OR REPLACE VIEW public.tenant_smtp_status AS
  SELECT
    id,
    slug,
    smtp_host,
    smtp_port,
    smtp_security,
    smtp_user,
    smtp_from_name,
    smtp_from_address,
    (smtp_password_enc IS NOT NULL) AS smtp_password_set,
    smtp_test_ok,
    smtp_test_at,
    smtp_test_error,
    dans_se_org,
    (dans_se_token_enc IS NOT NULL) AS dans_se_token_set,
    dans_se_last_synced_at,
    dans_se_last_sync_error
  FROM public.tenants;
