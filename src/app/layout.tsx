import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { IBM_Plex_Sans_Arabic, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const RTL_LOCALES = ["ar", "ckb"];

const inlineScript = `
(function(){
  try{
    var p = window.location.pathname || "/";
    var m = p.match(/^\\/(en|es|ckb)(\\/|$)/);
    var l = m ? m[1] : "ar";
    var r = (l === "ar" || l === "ckb");
    var html = document.documentElement;
    if (html) {
      html.lang = l;
      html.dir = r ? "rtl" : "ltr";
    }
  }catch(e){}
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("x-locale")?.value || "ar";
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`dark ${plexArabic.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
