import { Logo } from "@/app/components/logo";
import { getCurrentTenant, getTenantLogoUrl } from "@/lib/tenant/current";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();
  const logoUrl = tenant ? await getTenantLogoUrl(tenant.id) : null;

  return (
    <div className="flex min-h-screen items-center justify-center hero-gradient px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="flex justify-center"><Logo className="h-16 w-auto" logoUrl={logoUrl} /></h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/70">Bokningssystem</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lg">{children}</div>
      </div>
    </div>
  );
}
