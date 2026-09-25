"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGeneralSettings, saveThemeSettings } from "./actions";

type Tenant = {
  name: string;
  timezone: string;
  max_days_ahead: number;
  logo_url: string | null;
  theme: Record<string, string> | null;
};

export function GeneralSettingsForm({ tenant }: { tenant: Tenant }) {
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await saveGeneralSettings(formData);
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Klubbens namn"
          defaultValue={tenant.name}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="timezone"
          placeholder="Tidszon"
          defaultValue={tenant.timezone}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="max_days_ahead"
          type="number"
          placeholder="Max dagar i förväg"
          defaultValue={tenant.max_days_ahead}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
        <input
          name="logo_url"
          placeholder="Logo-URL (valfritt — ingen uppladdning ännu)"
          defaultValue={tenant.logo_url ?? ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Spara
      </button>
    </form>
  );
}

const THEME_FIELDS: { key: string; label: string }[] = [
  { key: "primary", label: "Primär" },
  { key: "onPrimary", label: "Text på primär" },
  { key: "secondary", label: "Sekundär" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Bakgrund" },
  { key: "surface", label: "Yta (kort)" },
  { key: "text", label: "Text" },
  { key: "mutedText", label: "Dämpad text" },
  { key: "headerFrom", label: "Header-gradient start" },
  { key: "headerTo", label: "Header-gradient slut" },
];

export function ThemeSettingsForm({ theme }: { theme: Record<string, string> | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await saveThemeSettings(formData);
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <p className="text-xs text-gray-500">
        Ingen live-förhandsvisning eller kontrastvarning ännu (simplifiering).
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs text-gray-600">
            {f.label}
            <input
              name={f.key}
              type="color"
              defaultValue={theme?.[f.key] ?? "#0B6E4F"}
              className="h-9 w-full rounded-md border border-gray-300"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Spara tema
      </button>
    </form>
  );
}
