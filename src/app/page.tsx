import Link from "next/link";
import { Users, Dumbbell, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              A
            </div>
            <span className="text-lg font-bold">Campo</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">المميزات</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition">عن المنصة</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">الأسعار</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">دخول</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">ابدأ الآن</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
            منصة إدارة أكاديميات كرة القدم
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            نظام تشغيل
            <span className="text-primary"> الأكاديمية </span>
            الكامل
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            منصة متكاملة لإدارة اللاعبين، الفرق، التدريبات، المباريات، والتطوير — كل شي بمكان واحد.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">ابدأ مجانًا</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">دخول للمنصة</Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 transition hover:border-primary/50">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <h3 className="mb-2 text-lg font-semibold">إدارة اللاعبين</h3>
            <p className="text-sm text-muted-foreground">
              ملف كامل لكل لاعب مع تاريخه وتطوره عبر الزمن.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 transition hover:border-primary/50">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15"><Dumbbell className="h-5 w-5 text-indigo-400" /></div>
            <h3 className="mb-2 text-lg font-semibold">التدريبات والحضور</h3>
            <p className="text-sm text-muted-foreground">
              خطّط التدريبات وسجّل الحضور بسهولة من أي جهاز.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 transition hover:border-primary/50">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <h3 className="mb-2 text-lg font-semibold">المباريات والإحصائيات</h3>
            <p className="text-sm text-muted-foreground">
              تابع المباريات وسجّل إحصائيات وتقييمات اللاعبين.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Campo — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
