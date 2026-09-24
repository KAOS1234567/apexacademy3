import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { getLocale } from "@/i18n/config";
import { getDirection } from "@/i18n/dictionaries";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Campo",
  description: "Football Academy Management SaaS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir} className={`dark ${plexArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
