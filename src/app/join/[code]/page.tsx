"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "not_logged" | "already_member";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [academyName, setAcademyName] = useState<string>("");

  useEffect(() => {
    async function join() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // احفظ الرابط وأعد التوجيه للـsignup
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pending_invite", code);
        }
        router.push(`/signup?invite=${code}`);
        return;
      }

      // 1. جيب الدعوة
      const { data: invite, error: inviteErr } = await supabase
        .from("academy_invites")
        .select("id, academy_id, role, is_active, expires_at, max_uses, used_count, academies(name)")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (inviteErr || !invite) {
        setMessage("الدعوة غير موجودة أو منتهية");
        setStatus("error");
        return;
      }

      // تحقق من الصلاحية
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setMessage("الدعوة منتهية الصلاحية");
        setStatus("error");
        return;
      }
      if (invite.max_uses && invite.used_count >= invite.max_uses) {
        setMessage("تم استنفاد الدعوة");
        setStatus("error");
        return;
      }

      setAcademyName((invite as unknown as { academies: { name: string } }).academies?.name || "الأكاديمية");

      // 2. تحقق إذا المستخدم عضو أصلًا
      const { data: existing } = await supabase
        .from("academy_members")
        .select("id")
        .eq("academy_id", invite.academy_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setStatus("already_member");
        return;
      }

      // 3. أضف المستخدم
      const { error: joinErr } = await supabase.from("academy_members").insert({
        academy_id: invite.academy_id,
        user_id: user.id,
        role: invite.role,
      });

      if (joinErr) {
        setMessage(joinErr.message);
        setStatus("error");
        return;
      }

      // 4. زد العدّاد
      await supabase
        .from("academy_invites")
        .update({ used_count: invite.used_count + 1 })
        .eq("id", invite.id);

      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }
    if (code) join();
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            A
          </div>
          <h1 className="text-2xl font-bold">Campo</h1>
        </div>

        <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">جاري معالجة الدعوة...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="text-xl font-bold">مرحباً بك!</h2>
              <p className="text-sm text-muted-foreground">
                انضممت إلى <span className="text-foreground font-medium">{academyName}</span>
              </p>
              <p className="text-xs text-muted-foreground">جاري التوجيه إلى لوحة التحكم...</p>
            </>
          )}

          {status === "already_member" && (
            <>
              <Building2 className="mx-auto h-14 w-14 text-blue-500" />
              <h2 className="text-xl font-bold">أنت عضو بالفعل</h2>
              <p className="text-sm text-muted-foreground">
                أنت عضو في <span className="text-foreground font-medium">{academyName}</span>
              </p>
              <Link href="/dashboard">
                <Button className="w-full">الذهاب إلى لوحة التحكم</Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h2 className="text-xl font-bold">فشل الانضمام</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Link href="/">
                <Button variant="outline" className="w-full">رجوع للرئيسية</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
