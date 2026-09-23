import { ClientShell } from "./ClientShell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isRTL = locale === "ar" || locale === "ckb";
  return <ClientShell isRTL={isRTL}>{children}</ClientShell>;
}
