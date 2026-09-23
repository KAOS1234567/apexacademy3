import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Intl first - handles locale detection/redirect
  const intlResponse = intlMiddleware(request);

  // 2. Get pathname without locale prefix (for public/auth matching)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(en|es|ckb)(?=\/|$)/);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : "";
  const cleanPath = localeMatch ? pathname.slice(localePrefix.length) : pathname;
  const cleanPathname = cleanPath || "/";

  const isPublicPage =
    cleanPathname === "/" || cleanPathname.startsWith("/join");
  const isAuthPage =
    cleanPathname.startsWith("/login") || cleanPathname.startsWith("/signup");

  // 3. Auth check via Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            intlResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 4. Redirect logic - preserving locale
  if (!user && !isPublicPage && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/login`;
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePrefix}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Set locale cookie for root layout (RTL/LTR)
  const localeMatch2 = pathname.match(/^\/(en|es|ckb)(?=\/|$)/);
  const detectedLocale = localeMatch2 ? localeMatch2[1] : "ar";
  request.cookies.set("x-locale", detectedLocale);
  intlResponse.cookies.set("x-locale", detectedLocale, { path: "/", sameSite: "lax" });

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
