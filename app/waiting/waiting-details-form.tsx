"use client";

import { useState } from "react";
import { updateAccessRequestDetails } from "@/app/(protected)/actions";

const ROLE_OPTIONS = ["Funktionär", "Tävlingsdansare", "Annat"] as const;
type RoleChoice = (typeof ROLE_OPTIONS)[number] | "";

// F3-R2: optional community role + message the user can add while waiting.
export function WaitingDetailsForm({ requestId }: { requestId: string }) {
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await updateAccessRequestDetails(requestId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  if (saved) {
    return (
      <p className="mt-4 text-sm text-yellow-700">Uppgifterna har sparats.</p>
    );
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3 border-t border-yellow-200 pt-4">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="communityRole" className="block text-sm font-medium text-yellow-800">
          Roll i föreningen (valfritt)
        </label>
        <select
          id="communityRole"
          name="communityRole"
          value={roleChoice}
          onChange={(e) => setRoleChoice(e.target.value as RoleChoice)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="">Ingen vald</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      {roleChoice === "Annat" && (
        <input
          name="communityRoleOther"
          type="text"
          placeholder="Beskriv din roll..."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      )}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-yellow-800">
          Meddelande till admin (valfritt)
        </label>
        <textarea
          id="message"
          name="message"
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
      >
        Spara
      </button>
    </form>
  );
}
