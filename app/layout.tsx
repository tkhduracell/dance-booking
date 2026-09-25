import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getCurrentTenant } from "@/lib/tenant/current";
import { createClient } from "@/lib/supabase/server";

// Self-hosted (from @fontsource-variable) so builds don't depend on Google Fonts
const inter = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-inter",
});
const montserrat = localFont({
  src: "./fonts/montserrat.woff2",
  weight: "100 900",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Gåsasteget Booking",
  description: "Lokalbokning för Gåsasteget – Lunds Dansklubb",
};

const THEME_VAR_MAP: Record<string, string> = {
  primary: "--color-primary",
  onPrimary: "--color-on-primary",
  secondary: "--color-secondary",
  accent: "--color-accent",
  background: "--color-background",
  surface: "--color-surface",
  text: "--color-text",
  mutedText: "--color-muted-text",
  headerFrom: "--color-header-from",
  headerTo: "--color-header-to",
};

/** F9-R8: server-rendered CSS vars from the tenant's theme jsonb, so there's
 * no flash of default colours. Minimal — components must be updated
 * separately to consume these vars instead of hard-coded Tailwind colours
 * (not done in this change; noted as a simplification). */
async function TenantThemeStyle() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("theme")
    .eq("id", tenant.id)
    .single();

  const theme = data?.theme as Record<string, string> | null;
  if (!theme) return null;

  const vars = Object.entries(THEME_VAR_MAP)
    .filter(([key]) => theme[key])
    .map(([key, cssVar]) => `${cssVar}:${theme[key]};`)
    .join("");

  if (!vars) return null;

  return <style>{`:root{${vars}}`}</style>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <TenantThemeStyle />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
