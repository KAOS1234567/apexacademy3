"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Academy = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  currency: string;
};

type Membership = {
  role: string;
  academies: Academy;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("academy_members")
        .select("role, academies(id, name, country, city, currency)")
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        router.push("/onboarding");
        return;
      }

      setMemberships(data as unknown as Membership[]);
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  const primary = memberships[0];

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">مرحبًا بك في</p>
        <h1 className="mt-1 text-3xl font-bold">{primary.academies.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {primary.academies.city && primary.academies.country
            ? `${primary.academies.city}، ${primary.academies.country}`
            : primary.academies.country || "—"}
          {" • "}
          دورك: <span className="font-medium text-foreground">{primary.role}</span>
          {" • "}
          <span className="text-xs">{userEmail}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">اللاعبين</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="mt-1 text-xs text-muted-foreground">قيد البناء</p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">الفرق</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="mt-1 text-xs text-muted-foreground">قيد البناء</p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">المدربين</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="mt-1 text-xs text-muted-foreground">قيد البناء</p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          المرحلة القادمة: إدارة اللاعبين، الفرق، والتدريبات
        </p>
      </div>
    </div>
  );
}
