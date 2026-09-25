"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "./actions";

export function CreateTenantForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await createTenant(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          name="name"
          placeholder="Namn (t.ex. Nackswinget)"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="slug"
          placeholder="Slug (t.ex. nsw)"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="domain"
          placeholder="Domän (valfritt)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Skapa klubb
      </button>
    </form>
  );
}
