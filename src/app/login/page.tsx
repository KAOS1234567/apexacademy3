"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDict } from "@/i18n/DictProvider";
import { FloatingLanguageToggle } from "@/components/layout/FloatingLanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { locale, dict } = useDict();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) { setError(err.message); setLoading(false); return; }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <FloatingLanguageToggle current={locale} />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            A
          </div>
          <h1 className="text-2xl font-bold">{dict.auth.loginTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{dict.auth.loginSubtitle}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{dict.auth.password}</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.auth.loggingIn : dict.auth.loginBtn}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {dict.auth.noAccount}{" "}
            <Link href="/signup" className="text-primary hover:underline">{dict.auth.createAccount}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
