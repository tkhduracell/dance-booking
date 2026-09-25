-- ============================================================
-- F9-R13: platform_audit_log — every super-admin change on a tenant is
-- recorded here (F9-R3). Written only by the service-role client (server
-- actions), which bypasses RLS; no INSERT policy is granted to
-- authenticated/anon.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB
);
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_tenant_id ON public.platform_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created_at ON public.platform_audit_log(created_at DESC);

-- Super-admins can read the audit log. No INSERT/UPDATE/DELETE policy for
-- authenticated/anon — only the service-role client (which bypasses RLS)
-- writes rows.
CREATE POLICY "Super admins can read platform_audit_log"
  ON public.platform_audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
