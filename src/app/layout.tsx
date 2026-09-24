import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { getLocale } from "@/i18n/config";
import { getDirection, dictionaries } from "@/i18n/dictionaries";
import { DictProvider } from "@/i18n/DictProvider";
import "./globals.css";

export const dynamic = "force-dynamic";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = getDirection(locale);
  const dict = dictionaries[locale];

  return (
    <html lang={locale} dir={dir} className={`dark ${plexArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <DictProvider locale={locale} dict={dict}>{children}</DictProvider>
      </body>
    </html>
  );
}
