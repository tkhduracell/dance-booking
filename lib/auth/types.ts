export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface Membership {
  user_id: string;
  tenant_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface UserWithPermissions {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface AccessRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  email: string;
  provider: string | null;
  community_role: string | null;
  message: string | null;
  status: "pending" | "approved" | "denied";
  deny_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}
