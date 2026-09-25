-- ============================================================
-- F4 Bookings, F8 Activity log, categories (F9-R5 subset)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- Categories ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories"
  ON public.categories FOR SELECT
  USING (active OR public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- ---------- Bookings ----------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  conflict_occasion_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- F4-R2: no overlap in the same room among confirmed bookings.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'confirmed');

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_by ON public.bookings(booked_by);

CREATE POLICY "Tenant members can read bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Bookers can create own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_member(auth.uid(), tenant_id)
    AND booked_by = auth.uid()
  );

-- F4-R4: booker can update own (app enforces "until start"); admin can update any.
CREATE POLICY "Bookers update own, admins update any"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    (booked_by = auth.uid() AND public.is_tenant_member(auth.uid(), tenant_id))
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  )
  WITH CHECK (
    (booked_by = auth.uid() AND public.is_tenant_member(auth.uid(), tenant_id))
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- ---------- Activity log (F8) ----------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('created', 'moved', 'edited', 'cancelled')),
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON public.activity_log(tenant_id, created_at DESC);

-- F8-R4: members only (booker/admin), append-only via app (no delete/update policy).
CREATE POLICY "Tenant members can read activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

-- F4-R7/F8-R2: resolve display names for booking/log actors. SECURITY DEFINER
-- since callers (tenant members) can't read auth.users directly; callers
-- already pass ids they got from tenant-scoped tables.
CREATE OR REPLACE FUNCTION public.get_user_display_names(p_user_ids UUID[])
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS name
  FROM auth.users u
  WHERE u.id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_display_names(UUID[]) TO authenticated;

-- ---------- Seed default categories for existing tenants ----------
INSERT INTO public.categories (tenant_id, name, color, sort_order)
SELECT t.id, c.name, c.color, c.sort_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('Träning', '#0B6E4F', 0),
  ('Privatlektion', '#8E5B3F', 1),
  ('Föreningsaktivitet', '#3F5B8E', 2)
) AS c(name, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cc WHERE cc.tenant_id = t.id
);
