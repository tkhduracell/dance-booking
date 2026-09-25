import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getCurrentTenant } from "@/lib/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { buildTenantBackground } from "@/lib/tenant/theme";

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

/** F9-R8: server-rendered CSS vars from the tenant's theme jsonb and
 * bg_gradient_* columns, so there's no flash of default colours.
 * primary/secondary also remap the purple-main/purple-light tokens that
 * existing components already use, so saved theme colours are visually
 * applied instead of sitting unused. */
async function TenantThemeStyle() {
  const tenant = await getCurrentTenant();
  if (!tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("theme, bg_gradient_from, bg_gradient_via, bg_gradient_to")
    .eq("id", tenant.id)
    .single();

  if (!data) return null;

  const theme = data.theme as Record<string, string> | null;

  const vars = Object.entries(THEME_VAR_MAP)
    .filter(([key]) => theme?.[key])
    .map(([key, cssVar]) => `${cssVar}:${theme![key]};`)
    .join("");

  const purpleVars = [
    theme?.primary ? `--color-purple-main:${theme.primary};` : "",
    theme?.secondary ? `--color-purple-light:${theme.secondary};` : "",
  ].join("");

  const bgVar = `--tenant-bg:${buildTenantBackground(data)};`;

  const allVars = `${vars}${purpleVars}${bgVar}`;
  return <style>{`:root{${allVars}}`}</style>;
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
