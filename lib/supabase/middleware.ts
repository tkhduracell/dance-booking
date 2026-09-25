import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  TENANT_COOKIE,
  findTenantByDomain,
  findTenantBySlug,
  resolveTenantSlug,
} from "@/lib/tenant/resolve";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured yet - skip auth checks
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session - this is required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve tenant (F0-R2/R3) and expose it via a request header + cookie.
  if (supabaseUrl && supabaseAnonKey) {
    const host = request.headers.get("host");
    const queryTenant = request.nextUrl.searchParams.get("tenant");
    const cookieTenant = request.cookies.get(TENANT_COOKIE)?.value ?? null;

    const domainTenant = host ? await findTenantByDomain(supabase, host) : null;
    // ?tenant= is ignored on registered custom domains.
    const effectiveQueryTenant = domainTenant ? null : queryTenant;

    const slug = resolveTenantSlug({
      host,
      domainTenantSlug: domainTenant?.slug ?? null,
      queryTenant: effectiveQueryTenant,
      cookieTenant,
      defaultTenant: process.env.DEFAULT_TENANT ?? null,
    });

    const tenant = domainTenant ?? (slug ? await findTenantBySlug(supabase, slug) : null);

    if (tenant) {
      supabaseResponse.headers.set("x-tenant-id", tenant.id);
      supabaseResponse.headers.set("x-tenant-slug", tenant.slug);
      if (!domainTenant && effectiveQueryTenant) {
        supabaseResponse.cookies.set(TENANT_COOKIE, tenant.slug, {
          path: "/",
          sameSite: "lax",
        });
      }
    }
  }

  // Permanent redirects for old Swedish route slugs (F2/F9 non-functional req).
  const oldToNew: Record<string, string> = {
    "/logga-in": "/login",
    "/registrera": "/register",
  };
  const newPath = oldToNew[request.nextUrl.pathname];
  if (newPath) {
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url, 308);
  }

  // Redirect unauthenticated users from protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/superadmin") ||
    request.nextUrl.pathname.startsWith("/waiting");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
