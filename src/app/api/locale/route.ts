import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dictionaries } from "@/i18n/dictionaries";

export async function GET() {
  const c = await cookies();
  const v = c.get("locale")?.value;
  const locale = (v && ["ar", "ku", "en", "es"].includes(v)) ? v : "ar";
  return NextResponse.json({ locale, dict: dictionaries[locale as "ar" | "ku" | "en" | "es"] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = body.locale as string;
  if (!["ar", "ku", "en", "es"].includes(locale)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
