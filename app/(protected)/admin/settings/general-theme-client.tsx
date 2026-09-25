"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveGeneralSettings,
  uploadTenantLogo,
  removeTenantLogo,
  saveUnifiedTheme,
  resetTenantTheme,
} from "./actions";
import { buildTenantBackground, isValidHex } from "@/lib/tenant/theme";

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

// ---------- F9-R8: unified theme panel ----------
type BgGradient = {
  bg_gradient_from: string | null;
  bg_gradient_via: string | null;
  bg_gradient_to: string | null;
};

type ThemeState = {
  primary: string;
  secondary: string;
  text: string;
  bg_gradient_from: string;
  bg_gradient_via: string;
  bg_gradient_to: string;
};

export const DEFAULT_THEME_STATE: ThemeState = {
  primary: "#4c4a82",
  secondary: "#7a4a82",
  text: "#1f2937",
  bg_gradient_from: "#2d284d",
  bg_gradient_via: "#4b4280",
  bg_gradient_to: "#9e97c4",
};

export const PRESETS: { name: string; values: ThemeState }[] = [
  { name: "Gåsasteget lila", values: DEFAULT_THEME_STATE },
  {
    name: "Turkos",
    values: {
      primary: "#0f766e",
      secondary: "#0891b2",
      text: "#0f172a",
      bg_gradient_from: "#134e4a",
      bg_gradient_via: "#0e7490",
      bg_gradient_to: "#5eead4",
    },
  },
  {
    name: "Skog",
    values: {
      primary: "#166534",
      secondary: "#4d7c0f",
      text: "#14532d",
      bg_gradient_from: "#14532d",
      bg_gradient_via: "#3f6212",
      bg_gradient_to: "#a3e635",
    },
  },
  {
    name: "Solnedgång",
    values: {
      primary: "#c2410c",
      secondary: "#db2777",
      text: "#431407",
      bg_gradient_from: "#7c2d12",
      bg_gradient_via: "#c2410c",
      bg_gradient_to: "#fbbf24",
    },
  },
];

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isValidHex(value);
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded-md border border-gray-300 p-0.5"
          aria-label={`${label} – färgväljare`}
        />
        <input
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={`h-9 w-full min-w-0 rounded-md border px-2 text-sm shadow-sm ${
            valid ? "border-gray-300" : "border-red-400"
          }`}
        />
      </div>
    </label>
  );
}

export function TenantThemePanel({
  theme,
  gradient,
  logoUrl,
  tenantName,
}: {
  theme: Record<string, string> | null;
  gradient: BgGradient;
  logoUrl: string | null;
  tenantName: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [state, setState] = useState<ThemeState>({
    primary: theme?.primary ?? DEFAULT_THEME_STATE.primary,
    secondary: theme?.secondary ?? DEFAULT_THEME_STATE.secondary,
    text: theme?.text ?? DEFAULT_THEME_STATE.text,
    bg_gradient_from: gradient.bg_gradient_from ?? DEFAULT_THEME_STATE.bg_gradient_from,
    bg_gradient_via: gradient.bg_gradient_via ?? DEFAULT_THEME_STATE.bg_gradient_via,
    bg_gradient_to: gradient.bg_gradient_to ?? DEFAULT_THEME_STATE.bg_gradient_to,
  });
  const router = useRouter();

  function set<K extends keyof ThemeState>(key: K, v: string) {
    setState((s) => ({ ...s, [key]: v }));
  }

  async function handleSubmit(formData: FormData) {
    const result = await saveUnifiedTheme(formData);
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  async function handleReset() {
    setState(DEFAULT_THEME_STATE);
    const result = await resetTenantTheme();
    setMsg(result.error ? `Fel: ${result.error}` : result.message ?? null);
    router.refresh();
  }

  const preview = buildTenantBackground({
    bg_gradient_from: state.bg_gradient_from,
    bg_gradient_via: state.bg_gradient_via,
    bg_gradient_to: state.bg_gradient_to,
  });

  return (
    <form action={handleSubmit} className="mt-4 space-y-4">
      {msg && <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">{msg}</div>}

      <div>
        <p className="mb-2 text-xs font-medium text-gray-600">Förinställda paletter</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setState(p.values)}
              className="flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <span
                className="h-4 w-4 rounded-full border border-black/10"
                style={{
                  background: `linear-gradient(135deg, ${p.values.primary}, ${p.values.secondary})`,
                }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ColorField
          label="Primär"
          name="primary"
          value={state.primary}
          onChange={(v) => set("primary", v)}
        />
        <ColorField
          label="Sekundär"
          name="secondary"
          value={state.secondary}
          onChange={(v) => set("secondary", v)}
        />
        <ColorField label="Text" name="text" value={state.text} onChange={(v) => set("text", v)} />
        <ColorField
          label="Gradient start"
          name="bg_gradient_from"
          value={state.bg_gradient_from}
          onChange={(v) => set("bg_gradient_from", v)}
        />
        <ColorField
          label="Gradient mitten"
          name="bg_gradient_via"
          value={state.bg_gradient_via}
          onChange={(v) => set("bg_gradient_via", v)}
        />
        <ColorField
          label="Gradient slut"
          name="bg_gradient_to"
          value={state.bg_gradient_to}
          onChange={(v) => set("bg_gradient_to", v)}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-600">Förhandsvisning</p>
        <div
          className="flex h-28 flex-col justify-between rounded-lg p-4 shadow-sm"
          style={{ background: preview }}
        >
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logotyp" className="h-8 max-w-24 object-contain" />
            ) : (
              <span className="text-sm font-semibold text-white">{tenantName}</span>
            )}
          </div>
          <button
            type="button"
            className="w-fit rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
            style={{ background: state.primary, color: "#fff" }}
          >
            Boka nu
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Spara tema
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Återställ standard
        </button>
      </div>
    </form>
  );
}
