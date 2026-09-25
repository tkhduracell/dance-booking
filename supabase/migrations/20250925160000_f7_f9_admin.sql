-- ============================================================
-- F7 tenant admin, F9 settings (general/theme), F4-R6 atomic booking RPCs,
-- F2-R8 self-service account deletion (FK cleanup).
-- ============================================================

-- ---------- F2-R8: ON DELETE SET NULL already present for bookings.booked_by
-- and activity_log.actor_id (see 20250925140000_f4_f6_f8_bookings.sql).
-- Nothing to change there.

-- ---------- F9-R6: general settings already has name/timezone/max_days_ahead/
-- logo_url on tenants. Nothing missing.

-- ---------- F9-R8: theme jsonb column already exists on tenants. Nothing
-- missing for storage; UI writes { primary, onPrimary, secondary, accent,
-- background, surface, text, mutedText, headerFrom, headerTo }.

-- ---------- F4-R6: atomic booking mutation + activity_log RPCs ----------
-- Mirrors get_user_roles_in_tenant/get_user_display_names style: SECURITY
-- DEFINER so the function can write activity_log even though callers only
-- have INSERT via RLS on their own booking, but here we keep RLS checks by
-- running as the calling role's checks are already done in the app layer
-- (validateBooking/canModifyBooking); the RPC still filters by tenant_id
-- and, for update/cancel, requires the caller be an admin or the booking's
-- owner, mirroring the existing bookings RLS policies.

CREATE OR REPLACE FUNCTION public.create_booking_with_log(
  p_tenant_id UUID,
  p_room_id UUID,
  p_category_id UUID,
  p_title TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_booked_by UUID,
  p_actor_id UUID
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  IF auth.uid() IS NULL OR p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch';
  END IF;
  IF p_booked_by <> p_actor_id THEN
    RAISE EXCEPTION 'booked_by must equal the acting user';
  END IF;

  IF NOT public.is_tenant_member(p_actor_id, p_tenant_id) THEN
    RAISE EXCEPTION 'not a tenant member';
  END IF;

  INSERT INTO public.bookings (tenant_id, room_id, category_id, title, starts_at, ends_at, booked_by)
  VALUES (p_tenant_id, p_room_id, p_category_id, p_title, p_starts_at, p_ends_at, p_booked_by)
  RETURNING * INTO v_booking;

  INSERT INTO public.activity_log (tenant_id, booking_id, actor_id, type, before, after)
  VALUES (
    p_tenant_id, v_booking.id, p_actor_id, 'created', NULL,
    jsonb_build_object('title', p_title, 'roomId', p_room_id, 'startsAt', p_starts_at)
  );

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_log(UUID, UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_booking_with_log(
  p_booking_id UUID,
  p_tenant_id UUID,
  p_room_id UUID,
  p_category_id UUID,
  p_title TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_actor_id UUID,
  p_log_type TEXT
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing public.bookings;
  v_booking public.bookings;
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch';
  END IF;
  SELECT * INTO v_existing FROM public.bookings
    WHERE id = p_booking_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  v_is_admin := public.is_tenant_admin(p_actor_id, p_tenant_id);
  IF NOT v_is_admin AND v_existing.booked_by <> p_actor_id THEN
    RAISE EXCEPTION 'not allowed to modify this booking';
  END IF;

  UPDATE public.bookings SET
    room_id = p_room_id,
    category_id = p_category_id,
    title = p_title,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    updated_at = now(),
    conflict_occasion_id = NULL
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  INSERT INTO public.activity_log (tenant_id, booking_id, actor_id, type, before, after)
  VALUES (
    p_tenant_id, p_booking_id, p_actor_id, p_log_type,
    jsonb_build_object('title', v_existing.title, 'roomId', v_existing.room_id, 'startsAt', v_existing.starts_at),
    jsonb_build_object('title', p_title, 'roomId', p_room_id, 'startsAt', p_starts_at)
  );

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_with_log(UUID, UUID, UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking_with_log(
  p_booking_id UUID,
  p_tenant_id UUID,
  p_actor_id UUID
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing public.bookings;
  v_booking public.bookings;
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor mismatch';
  END IF;
  SELECT * INTO v_existing FROM public.bookings
    WHERE id = p_booking_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  v_is_admin := public.is_tenant_admin(p_actor_id, p_tenant_id);
  IF NOT v_is_admin AND v_existing.booked_by <> p_actor_id THEN
    RAISE EXCEPTION 'not allowed to cancel this booking';
  END IF;

  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  INSERT INTO public.activity_log (tenant_id, booking_id, actor_id, type, before, after)
  VALUES (
    p_tenant_id, p_booking_id, p_actor_id, 'cancelled',
    jsonb_build_object('title', v_existing.title, 'roomId', v_existing.room_id, 'startsAt', v_existing.starts_at),
    NULL
  );

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_with_log(UUID, UUID, UUID) TO authenticated;

-- ---------- F7-R1: last-admin guard helper ----------
CREATE OR REPLACE FUNCTION public.admin_count_in_tenant(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.memberships m
  JOIN public.roles r ON r.id = m.role_id
  WHERE m.tenant_id = p_tenant_id AND r.name = 'admin'
    AND public.is_tenant_admin(auth.uid(), p_tenant_id);
$$;

GRANT EXECUTE ON FUNCTION public.admin_count_in_tenant(UUID) TO authenticated;

-- ---------- F7 members: list members with role + display name/email ----------
CREATE OR REPLACE FUNCTION public.get_tenant_members(p_tenant_id UUID)
RETURNS TABLE(user_id UUID, name TEXT, email TEXT, roles TEXT[])
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    m.user_id,
    COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS name,
    u.email,
    array_agg(r.name) AS roles
  FROM public.memberships m
  JOIN auth.users u ON u.id = m.user_id
  JOIN public.roles r ON r.id = m.role_id
  WHERE m.tenant_id = p_tenant_id
    AND public.is_tenant_admin(auth.uid(), p_tenant_id)
  GROUP BY m.user_id, u.raw_user_meta_data, u.email;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_members(UUID) TO authenticated;

-- ---------- F5-R3: imported courses with occasion counts + conflict counts ----------
CREATE OR REPLACE FUNCTION public.get_imported_courses_with_conflicts(p_tenant_id UUID)
RETURNS TABLE(
  course_id UUID,
  name TEXT,
  schedule_text TEXT,
  occasions_count BIGINT,
  conflicts_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.schedule_text,
    (SELECT COUNT(*) FROM public.imported_occasions io WHERE io.course_id = c.id) AS occasions_count,
    (
      SELECT COUNT(*) FROM public.bookings b
      JOIN public.imported_occasions io ON io.id = b.conflict_occasion_id
      WHERE io.course_id = c.id
    ) AS conflicts_count
  FROM public.imported_courses c
  WHERE c.tenant_id = p_tenant_id AND c.removed_at IS NULL
    AND public.is_tenant_admin(auth.uid(), p_tenant_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_imported_courses_with_conflicts(UUID) TO authenticated;
