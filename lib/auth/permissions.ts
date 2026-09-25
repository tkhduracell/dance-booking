import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant/current";
import type { UserWithPermissions } from "./types";

export const PERMISSIONS = {
  BOOKINGS_CREATE: "bookings.create",
  BOOKINGS_READ: "bookings.read",
  BOOKINGS_UPDATE: "bookings.update",
  BOOKINGS_DELETE: "bookings.delete",
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  REQUESTS_MANAGE: "requests.manage",
} as const;

export type PermissionAction = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Get the current authenticated user with their roles/permissions in the
 * current tenant (resolved from the request via getCurrentTenant()).
 * Returns null if not authenticated or no tenant is resolved.
 */
export async function getCurrentUser(): Promise<UserWithPermissions | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  // Fetch user roles in this tenant
  const { data: userRoles } = await supabase.rpc("get_user_roles_in_tenant", {
    p_user_id: user.id,
    p_tenant_id: tenant.id,
  });

  const roles =
    (userRoles as { role_name: string }[] | null)?.map(
      (r) => r.role_name
    ) ?? [];

  // Fetch permissions based on roles in this tenant
  const { data: rolePermissions } = await supabase
    .from("memberships")
    .select(
      `
      roles:role_id (
        role_permissions (
          permissions:permission_id (
            action
          )
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id);

  const permissions = new Set<string>();
  if (rolePermissions) {
    for (const m of rolePermissions) {
      const roles = m.roles as unknown as {
        role_permissions: { permissions: { action: string } }[];
      };
      if (roles?.role_permissions) {
        for (const rp of roles.role_permissions) {
          if (rp.permissions?.action) {
            permissions.add(rp.permissions.action);
          }
        }
      }
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    tenantId: tenant.id,
    roles,
    permissions: Array.from(permissions),
  };
}

/**
 * Check if the current user has a specific permission in the current tenant.
 */
export async function hasPermission(action: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(action);
}

/**
 * Require a specific permission. Redirects to / if denied.
 */
export async function requirePermission(action: string): Promise<void> {
  const allowed = await hasPermission(action);
  if (!allowed) {
    redirect("/");
  }
}

/**
 * Check if the current user has a specific role in the current tenant.
 */
export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.roles.includes(roleName);
}

/**
 * Require a specific role. Redirects to / if denied.
 */
export async function requireRole(roleName: string): Promise<void> {
  const allowed = await hasRole(roleName);
  if (!allowed) {
    redirect("/");
  }
}

/**
 * F9-R1: is the current auth user's verified email listed in
 * platform_admins? Not tenant-scoped.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.rpc("is_super_admin", {
    p_user_id: user.id,
  });
  return Boolean(data);
}

/** F9-R2: require super-admin. Redirects to / if denied. */
export async function requireSuperAdmin(): Promise<void> {
  const allowed = await isSuperAdmin();
  if (!allowed) {
    redirect("/");
  }
}
