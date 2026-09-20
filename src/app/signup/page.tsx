"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ academy_name: string; role: string } | null>(null);

  // اقرأ الكود من URL مباشرة
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite") || sessionStorage.getItem("pending_invite");

    if (code) {
      setInviteCode(code);
      sessionStorage.setItem("pending_invite", code);

      const supabase = createClient();
      supabase
        .from("academy_invites")
        .select("role, academies(name)")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const acName = (data as unknown as { academies: { name: string } }).academies?.name || "الأكاديمية";
            setInviteInfo({ academy_name: acName, role: data.role });
          }
        });
    }
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }

    setLoading(true);
    const supabase = createClient();

    // 1. سجل
    const { error: signupErr } = await supabase.auth.signUp({ email, password });
    if (signupErr) { setError(signupErr.message); setLoading(false); return; }

    // 2. سجل دخول (لضمان session)
    const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signinErr) { setError(signinErr.message); setLoading(false); return; }

    // 3. جيب المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("فشل تسجيل الدخول"); setLoading(false); return; }

    // 4. اقرأ كود الدعوة من جديد (احتياط)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite") || inviteCode || sessionStorage.getItem("pending_invite");

    if (code) {
      // جيب الدعوة
      const { data: invite, error: invErr } = await supabase
        .from("academy_invites")
        .select("id, academy_id, role, used_count, is_active, expires_at, max_uses")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (invErr) { setError("خطأ في قراءة الدعوة: " + invErr.message); setLoading(false); return; }

      if (invite) {
        const expired = invite.expires_at && new Date(invite.expires_at) < new Date();
        const used = invite.max_uses && invite.used_count >= invite.max_uses;

        if (!expired && !used) {
          // أضف العضو
          const { error: joinErr } = await supabase.from("academy_members").insert({
            academy_id: invite.academy_id,
            user_id: user.id,
            role: invite.role,
          });

          if (joinErr) {
            setError("فشل الانضمام: " + joinErr.message);
            setLoading(false);
            return;
          }

          // زد العدّاد
          await supabase
            .from("academy_invites")
            .update({ used_count: invite.used_count + 1 })
            .eq("id", invite.id);

          sessionStorage.removeItem("pending_invite");
          router.push("/dashboard");
          router.refresh();
          return;
        } else {
          setError("الدعوة منتهية أو مستنفدة");
          setLoading(false);
          return;
        }
      } else {
        setError("الدعوة غير موجودة — كود: " + code);
        setLoading(false);
        return;
      }
    }

    // لا دعوة
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
            {inviteInfo ? (
              <>انضم إلى <span className="text-accent font-medium">{inviteInfo.academy_name}</span></>
            ) : inviteCode ? (
              "لديك دعوة للانضمام"
            ) : (
              "ابدأ رحلتك مع Campo"
            )}
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
          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive break-all">{error}</div>)}
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
