import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, RTL_LOCALES, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  const isRTL = RTL_LOCALES.includes(locale as Locale);
  const dirScript = `
    (function(){
      try{
        document.documentElement.lang = ${JSON.stringify(locale)};
        document.documentElement.dir = ${JSON.stringify(isRTL ? "rtl" : "ltr")};
      }catch(e){}
    })();
  `;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: dirScript }} />
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </>
  );
}
