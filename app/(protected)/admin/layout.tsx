import { redirect } from "next/navigation";
import { hasRole, isSuperAdmin } from "@/lib/auth/permissions";

const TABS = [
  { href: "/admin", label: "Förfrågningar" },
  { href: "/admin/members", label: "Medlemmar" },
  { href: "/admin/bookings", label: "Bokningar" },
  { href: "/admin/courses", label: "Importerade kurser" },
  { href: "/admin/settings", label: "Inställningar" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, superAdmin] = await Promise.all([hasRole("admin"), isSuperAdmin()]);
  if (!isAdmin && !superAdmin) {
    redirect("/");
  }

  const tabs = superAdmin ? [...TABS, { href: "/admin/tenants", label: "Klubbar" }] : TABS;

  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {tab.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
