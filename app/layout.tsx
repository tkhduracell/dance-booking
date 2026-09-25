import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "800"],
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
