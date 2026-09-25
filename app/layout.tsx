import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
