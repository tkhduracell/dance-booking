-- ============================================================
-- Local dev seed data. Schema lives in supabase/migrations/.
-- Creates: platform admin, two tenants with a main room each,
-- and local test auth users (admin + booker) with known passwords.
-- DEV ONLY — never run against staging/production.
-- ============================================================

-- Platform admin (super-admin)
INSERT INTO public.platform_admins (email) VALUES ('buggfille@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Full tenant access'),
  ('booker', 'Can create and manage own bookings')
ON CONFLICT (name) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (action, description) VALUES
  ('bookings.create', 'Create new bookings'),
  ('bookings.read', 'View bookings'),
  ('bookings.update', 'Modify bookings'),
  ('bookings.delete', 'Cancel bookings'),
  ('users.read', 'View user list'),
  ('users.manage', 'Manage user accounts'),
  ('requests.manage', 'Approve or deny access requests')
ON CONFLICT (action) DO NOTHING;

-- Role-permission mapping
INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM public.roles r, public.permissions p
  WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM public.roles r, public.permissions p
  WHERE r.name = 'booker'
    AND p.action IN ('bookings.create', 'bookings.read', 'bookings.update', 'bookings.delete')
ON CONFLICT DO NOTHING;

-- Tenants
INSERT INTO public.tenants (id, slug, name, timezone)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'gasasteget', 'Gåsasteget', 'Europe/Stockholm'),
  ('00000000-0000-0000-0000-000000000002', 'nsw', 'Nackswinget', 'Europe/Stockholm')
ON CONFLICT (slug) DO NOTHING;

-- Local dev domains (for host-based resolution testing)
INSERT INTO public.tenant_domains (domain, tenant_id) VALUES
  ('gasasteget.localhost', '00000000-0000-0000-0000-000000000001'),
  ('nsw.localhost', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (domain) DO NOTHING;

-- Main room per tenant
INSERT INTO public.rooms (id, tenant_id, title, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Stora salen', 'Huvudlokal', 0),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Stora salen', 'Huvudlokal', 0)
ON CONFLICT (id) DO NOTHING;

UPDATE public.tenants SET course_room_id = '00000000-0000-0000-0000-000000000011' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.tenants SET course_room_id = '00000000-0000-0000-0000-000000000012' WHERE id = '00000000-0000-0000-0000-000000000002';

-- F9-R8: Gåsasteget keeps the default purple hero gradient (bg_gradient_*
-- left NULL, defaults applied in lib/tenant/theme.ts). Nackswinget gets a
-- distinct gradient so switching ?tenant=nsw is visibly different.
UPDATE public.tenants SET
  bg_gradient_from = '#0f3d3e',
  bg_gradient_via = '#1f6f6e',
  bg_gradient_to = '#8fd4c9'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- F9-R10: both tenants' SMTP → local Supabase mail catcher (Inbucket/Mailpit),
-- no auth needed. See supabase/config.toml [local_smtp] smtp_port.
UPDATE public.tenants SET
  smtp_host = '127.0.0.1',
  smtp_port = 54325,
  smtp_security = 'none',
  smtp_from_name = 'Gåsasteget',
  smtp_from_address = 'no-reply@gasasteget.localhost'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.tenants SET
  smtp_host = '127.0.0.1',
  smtp_port = 54325,
  smtp_security = 'none',
  smtp_from_name = 'Nackswinget',
  smtp_from_address = 'no-reply@nsw.localhost'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- ============================================================
-- Local dev auth users (dev only, known passwords)
-- super-admin: buggfille@gmail.com / devpassword123
-- test admin:  admin@example.com   / devpassword123
-- test booker: booker@example.com  / devpassword123
-- ============================================================
DO $$
DECLARE
  super_admin_id UUID;
  test_admin_id UUID;
  test_booker_id UUID;
  admin_role_id UUID;
  booker_role_id UUID;
  gasasteget_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO booker_role_id FROM public.roles WHERE name = 'booker';

  -- super-admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'buggfille@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'buggfille@gmail.com', crypt('devpassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Filip"}'
    );
  END IF;
  SELECT id INTO super_admin_id FROM auth.users WHERE email = 'buggfille@gmail.com';

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), super_admin_id::text, super_admin_id,
    jsonb_build_object('sub', super_admin_id::text, 'email', 'buggfille@gmail.com'),
    'email', now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, tenant_id, role_id)
  VALUES (super_admin_id, gasasteget_id, admin_role_id)
  ON CONFLICT DO NOTHING;

  -- test admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'admin@example.com', crypt('devpassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Test Admin"}'
    );
  END IF;
  SELECT id INTO test_admin_id FROM auth.users WHERE email = 'admin@example.com';

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), test_admin_id::text, test_admin_id,
    jsonb_build_object('sub', test_admin_id::text, 'email', 'admin@example.com'),
    'email', now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, tenant_id, role_id)
  VALUES (test_admin_id, gasasteget_id, admin_role_id)
  ON CONFLICT DO NOTHING;

  -- test booker user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'booker@example.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'booker@example.com', crypt('devpassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Test Booker"}'
    );
  END IF;
  SELECT id INTO test_booker_id FROM auth.users WHERE email = 'booker@example.com';

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), test_booker_id::text, test_booker_id,
    jsonb_build_object('sub', test_booker_id::text, 'email', 'booker@example.com'),
    'email', now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.memberships (user_id, tenant_id, role_id)
  VALUES (test_booker_id, gasasteget_id, booker_role_id)
  ON CONFLICT DO NOTHING;

  -- Migrate any pre-existing user_roles / access_requests data into Gåsasteget (F0-R9)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    INSERT INTO public.memberships (user_id, tenant_id, role_id, assigned_at, assigned_by)
    SELECT ur.user_id, gasasteget_id, ur.role_id, ur.assigned_at, ur.assigned_by
    FROM public.user_roles ur
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
END $$;

-- GoTrue fails ("Database error finding user") on NULL token columns
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

-- ============================================================
-- F4/F8: sample bookings for Gåsasteget, booked by the test booker.
-- ============================================================
DO $$
DECLARE
  gasasteget_id UUID := '00000000-0000-0000-0000-000000000001';
  stora_id UUID := '00000000-0000-0000-0000-000000000011';
  booker_id UUID;
  training_cat UUID;
  private_cat UUID;
  booking1 UUID;
  booking2 UUID;
BEGIN
  SELECT id INTO booker_id FROM auth.users WHERE email = 'booker@example.com';
  SELECT id INTO training_cat FROM public.categories WHERE tenant_id = gasasteget_id AND name = 'Träning';
  SELECT id INTO private_cat FROM public.categories WHERE tenant_id = gasasteget_id AND name = 'Privatlektion';

  IF booker_id IS NOT NULL AND training_cat IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE tenant_id = gasasteget_id) THEN
    INSERT INTO public.bookings (tenant_id, room_id, booked_by, category_id, title, starts_at, ends_at)
    VALUES (
      gasasteget_id, stora_id, booker_id, training_cat, 'Träning',
      (date_trunc('day', now()) + interval '3 days' + interval '18 hours'),
      (date_trunc('day', now()) + interval '3 days' + interval '20 hours')
    ) RETURNING id INTO booking1;

    INSERT INTO public.bookings (tenant_id, room_id, booked_by, category_id, title, starts_at, ends_at)
    VALUES (
      gasasteget_id, stora_id, booker_id, private_cat, 'Privatlektion',
      (date_trunc('day', now()) + interval '5 days' + interval '19 hours'),
      (date_trunc('day', now()) + interval '5 days' + interval '20 hours')
    ) RETURNING id INTO booking2;

    INSERT INTO public.activity_log (tenant_id, booking_id, actor_id, type, before, after)
    VALUES
      (gasasteget_id, booking1, booker_id, 'created', NULL, jsonb_build_object('title', 'Träning', 'roomId', stora_id)),
      (gasasteget_id, booking2, booker_id, 'created', NULL, jsonb_build_object('title', 'Privatlektion', 'roomId', stora_id));
  END IF;
END $$;
