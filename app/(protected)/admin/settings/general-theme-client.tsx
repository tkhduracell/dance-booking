"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveGeneralSettings,
  saveThemeSettings,
  uploadTenantLogo,
  removeTenantLogo,
  saveBackgroundGradient,
} from "./actions";
import { buildTenantBackground } from "@/lib/tenant/theme";

type Tenant = {
  name: string;
  timezone: string;
  max_days_ahead: number;
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

// ---------- F9-R6: logo upload ----------
export function LogoUploadForm({ logoUrl }: { logoUrl: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await uploadTenantLogo(formData);
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  async function handleRemove() {
    const result = await removeTenantLogo();
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-32 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Nuvarande logotyp" className="max-h-14 max-w-28" />
          ) : (
            <span className="text-xs text-gray-400">Standardlogotyp</span>
          )}
        </div>
        <form action={handleSubmit} className="flex items-center gap-2">
          <input
            name="logo"
            type="file"
            accept="image/png,image/webp"
            required
            className="text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Ladda upp
          </button>
        </form>
        {logoUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ta bort
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">PNG eller WebP, max 1MB.</p>
    </div>
  );
}

// ---------- F9-R8: background gradient ----------
type BgGradient = {
  bg_gradient_from: string | null;
  bg_gradient_via: string | null;
  bg_gradient_to: string | null;
};

export function BackgroundGradientForm({ gradient }: { gradient: BgGradient }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [from, setFrom] = useState(gradient.bg_gradient_from ?? "#2d284d");
  const [via, setVia] = useState(gradient.bg_gradient_via ?? "#4b4280");
  const [to, setTo] = useState(gradient.bg_gradient_to ?? "#9e97c4");
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await saveBackgroundGradient(formData);
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  const preview = buildTenantBackground({
    bg_gradient_from: from,
    bg_gradient_via: via,
    bg_gradient_to: to,
  });

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}
      <div
        className="h-16 w-full rounded-md border border-gray-200"
        style={{ background: preview }}
        aria-label="Förhandsvisning av bakgrund"
      />
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Start
          <input
            name="bg_gradient_from"
            type="color"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Mitten (valfritt)
          <input
            name="bg_gradient_via"
            type="color"
            value={via}
            onChange={(e) => setVia(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Slut (valfritt)
          <input
            name="bg_gradient_to"
            type="color"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Bara start ifylld ger en enfärgad bakgrund. Standard är Gåsastegets lila gradient.
      </p>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Spara bakgrund
      </button>
    </form>
  );
}
