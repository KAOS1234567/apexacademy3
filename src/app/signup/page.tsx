"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // احفظ الكود في sessionStorage دائمًا
    if (inviteCode) {
      sessionStorage.setItem("pending_invite", inviteCode);
    }
  }, [inviteCode]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: signupErr } = await supabase.auth.signUp({ email, password });

    if (signupErr) { setError(signupErr.message); setLoading(false); return; }

    // بعد التسجيل - عالج الدعوة إذا موجودة
    const pendingCode = inviteCode || sessionStorage.getItem("pending_invite");

    if (pendingCode) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // جيب الدعوة
        const { data: invite } = await supabase
          .from("academy_invites")
          .select("id, academy_id, role, used_count, is_active, expires_at, max_uses")
          .eq("code", pendingCode)
          .eq("is_active", true)
          .maybeSingle();

        if (invite) {
          // أضف المستخدم للأكاديمية
          const { error: joinErr } = await supabase.from("academy_members").insert({
            academy_id: invite.academy_id,
            user_id: user.id,
            role: invite.role,
          });

          if (!joinErr) {
            // زد العدّاد
            await supabase
              .from("academy_invites")
              .update({ used_count: invite.used_count + 1 })
              .eq("id", invite.id);

            sessionStorage.removeItem("pending_invite");
            router.push("/dashboard");
            router.refresh();
            return;
          }
        }
      }
    }

    // إذا ما فيه دعوة أو فشلت → onboarding عادي
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            A
          </div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteCode ? "لديك دعوة للانضمام لأكاديمية" : "ابدأ رحلتك مع Campo"}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            عندك حساب؟ <Link href="/login" className="text-primary hover:underline">سجّل دخول</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
