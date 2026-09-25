-- ============================================================
-- F0 Tenancy: tenants, domains, rooms, memberships, RLS
-- Replaces manual seed.sql schema (roles/permissions kept, per-tenant
-- role assignment moves from user_roles to memberships).
-- ============================================================

-- ---------- Platform ----------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  email TEXT PRIMARY KEY
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    JOIN auth.users u ON lower(u.email) = lower(pa.email)
    WHERE u.id = p_user_id
  );
$$;

CREATE POLICY "Super admins can read platform_admins"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- Tenants ----------
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
  max_days_ahead INTEGER NOT NULL DEFAULT 90,
  logo_url TEXT,
  dans_se_org TEXT,
  course_room_id UUID,
  theme JSONB,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_security TEXT,
  smtp_user TEXT,
  smtp_from_name TEXT,
  smtp_from_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  domain TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- ---------- Rooms ----------
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_course_room_fk
  FOREIGN KEY (course_room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

-- ---------- Roles & permissions (unchanged, still global/data-driven) ----------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ---------- Memberships (per-tenant role assignment, replaces user_roles) ----------
CREATE TABLE IF NOT EXISTS public.memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, tenant_id)
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON public.memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);

-- ---------- Access requests (per-tenant) ----------
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT,
  community_role TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  deny_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_access_requests_pending
  ON public.access_requests (tenant_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_tenant_id ON public.access_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);

-- ============================================================
-- Helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_permission_in_tenant(p_user_id UUID, p_tenant_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.role_permissions rp ON rp.role_id = m.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id AND p.action = p_action
  ) OR public.is_super_admin(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles_in_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(role_name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.name
  FROM public.memberships m
  JOIN public.roles r ON r.id = m.role_id
  WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.id = m.role_id
    WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id AND r.name = 'admin'
  ) OR public.is_super_admin(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id
  ) OR public.is_super_admin(p_user_id);
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- tenants: anyone (incl anon) can read active tenants (needed for public schedule/branding)
CREATE POLICY "Anyone can read active tenants"
  ON public.tenants FOR SELECT
  USING (active OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- tenant_domains: public read (needed to resolve host -> tenant), super admin write
CREATE POLICY "Anyone can read tenant_domains"
  ON public.tenant_domains FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage tenant_domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- rooms: public read of active rooms (schedule); tenant admins manage own tenant's rooms
CREATE POLICY "Anyone can read active rooms"
  ON public.rooms FOR SELECT
  USING (active OR public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage rooms"
  ON public.rooms FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- roles/permissions/role_permissions: readable by any authenticated user
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- memberships: user reads own; tenant admins/super admins read+manage tenant's memberships
CREATE POLICY "Users can read own memberships or tenant admins read all"
  ON public.memberships FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

CREATE POLICY "Tenant admins can insert memberships"
  ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update memberships"
  ON public.memberships FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete memberships"
  ON public.memberships FOR DELETE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- access_requests: user can create/read own; tenant admins read/update tenant's requests
CREATE POLICY "Users can create own access requests"
  ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own access requests or tenant admins read all"
  ON public.access_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

CREATE POLICY "Tenant admins can update access requests"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));
