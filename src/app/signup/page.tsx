"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDict } from "@/i18n/DictProvider";
import { FloatingLanguageToggle } from "@/components/layout/FloatingLanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const { locale, dict } = useDict();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteAcademy, setInviteAcademy] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite") || sessionStorage.getItem("pending_invite");
    if (code) {
      setInviteCode(code);
      sessionStorage.setItem("pending_invite", code);
      const supabase = createClient();
      supabase.from("academy_invites").select("academies(name)").eq("code", code).eq("is_active", true).maybeSingle().then(({ data }) => {
        if (data) setInviteAcademy((data as unknown as { academies: { name: string } }).academies?.name || null);
      });
    }
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError(dict.auth.passwordMismatch); return; }
    if (password.length < 6) { setError(dict.auth.passwordShort); return; }

    setLoading(true);
    const supabase = createClient();

    const { error: signupErr } = await supabase.auth.signUp({ email, password });
    if (signupErr) { setError(signupErr.message); setLoading(false); return; }

    const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signinErr) { setError(signinErr.message); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session error"); setLoading(false); return; }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite") || inviteCode || sessionStorage.getItem("pending_invite");

    if (code) {
      const { data: invite } = await supabase.from("academy_invites").select("id, academy_id, role, used_count, is_active, expires_at, max_uses").eq("code", code).eq("is_active", true).maybeSingle();

      if (invite) {
        const expired = invite.expires_at && new Date(invite.expires_at) < new Date();
        const used = invite.max_uses && invite.used_count >= invite.max_uses;

        if (!expired && !used) {
          const { error: joinErr } = await supabase.from("academy_members").insert({
            academy_id: invite.academy_id, user_id: user.id, role: invite.role,
          });
          if (joinErr) { setError("Join error: " + joinErr.message); setLoading(false); return; }

          await supabase.from("academy_invites").update({ used_count: invite.used_count + 1 }).eq("id", invite.id);
          sessionStorage.removeItem("pending_invite");
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }
    }

    router.push("/onboarding");
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
          <h1 className="text-2xl font-bold">{dict.auth.signupTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteAcademy ? (<>{dict.auth.inviteTo} <span className="text-accent font-medium">{inviteAcademy}</span></>) : inviteCode ? dict.auth.hasInvite : dict.auth.signupSubtitle}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{dict.auth.password}</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{dict.auth.confirmPassword}</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} dir="ltr" />
          </div>
          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive break-all">{error}</div>)}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.auth.signingUp : dict.auth.signupBtn}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {dict.auth.haveAccount}{" "}
            <Link href="/login" className="text-primary hover:underline">{dict.auth.signIn}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
