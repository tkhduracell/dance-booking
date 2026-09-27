-- Reference data required in every environment (F9-R1, F0 first tenants).
-- Idempotent; supabase/seed.sql repeats it for local dev.

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

-- Main room per tenant
INSERT INTO public.rooms (id, tenant_id, title, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Stora salen', 'Huvudlokal', 0),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Stora salen', 'Huvudlokal', 0)
ON CONFLICT (id) DO NOTHING;

UPDATE public.tenants SET course_room_id = '00000000-0000-0000-0000-000000000011' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.tenants SET course_room_id = '00000000-0000-0000-0000-000000000012' WHERE id = '00000000-0000-0000-0000-000000000002';
