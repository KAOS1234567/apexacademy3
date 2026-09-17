import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            A
          </div>
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أهلاً بك في ApexAcademy Cloud
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <p className="mb-6 text-center text-sm text-muted-foreground">
            صفحة تسجيل الدخول قيد البناء
          </p>
          <Link href="/">
            <Button className="w-full" variant="outline">
              رجوع للرئيسية
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
