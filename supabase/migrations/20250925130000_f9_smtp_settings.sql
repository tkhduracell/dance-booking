-- ============================================================
-- F9-R10/R11: per-tenant SMTP settings. Password is stored encrypted
-- (app-side AES-256-GCM, SMTP_ENC_KEY env), write-only from the client:
-- no RLS SELECT ever exposes smtp_password_enc, and app code must not
-- return it to the browser or log it.
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS smtp_password_enc BYTEA,
  ADD COLUMN IF NOT EXISTS smtp_test_ok BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS smtp_test_error TEXT;

-- Client-safe view: everything except the encrypted password. Server code
-- (service role) reads smtp_password_enc directly from public.tenants;
-- browser/anon/authenticated code should use this view instead.
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
    smtp_test_error
  FROM public.tenants;
