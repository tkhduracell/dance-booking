import { requireRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant/current";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Importerade kurser - Gasasteget",
};

export default async function ImportedCoursesPage() {
  await requireRole("admin");
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const supabase = await createClient();
  const { data: courses } = await supabase.rpc("get_imported_courses_with_conflicts", {
    p_tenant_id: tenant.id,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Importerade kurser</h1>
      <p className="mt-2 text-gray-600">
        F5-R3: kurser importerade från dans.se och bokningar som krockar med dem.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-500">Namn</th>
              <th className="pb-2 text-left font-medium text-gray-500">Schema</th>
              <th className="pb-2 text-left font-medium text-gray-500">Tillfällen</th>
              <th className="pb-2 text-left font-medium text-gray-500">Krockande bokningar</th>
            </tr>
          </thead>
          <tbody>
            {(courses ?? []).map(
              (c: {
                course_id: string;
                name: string;
                schedule_text: string | null;
                occasions_count: number;
                conflicts_count: number;
              }) => (
                <tr key={c.course_id} className="border-b border-gray-100">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-gray-600">{c.schedule_text ?? "—"}</td>
                  <td className="py-2">{c.occasions_count}</td>
                  <td className="py-2">
                    {c.conflicts_count > 0 ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                        {c.conflicts_count}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              )
            )}
            {(courses ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  Inga importerade kurser.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
