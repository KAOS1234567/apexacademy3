"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict } from "@/i18n/DictProvider";
import { teamsDict } from "@/i18n/teams";

export default function NewTeamPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale } = useDict();
  const t = (teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).form;

  const [academyId, setAcademyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      setAcademyId(members[0].academy_id);
    }
    load();
  }, [router]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(t.errImageSize); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!academyId) return;
    if (name.trim().length < 2) { setError(t.errName); return; }

    setLoading(true);
    const supabase = createClient();

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "jpg";
      const fileName = `teams/${academyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("players").upload(fileName, logoFile);
      if (upErr) { setError(t.errUpload + upErr.message); setLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
      logoUrl = publicUrl;
    }

    const { error: err } = await supabase.from("teams").insert({
      academy_id: academyId, name: name.trim(),
      category: category || null, season: season.trim() || null,
      description: description.trim() || null, logo_url: logoUrl,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/dashboard/teams");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/teams" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />{t.back}
        </Link>

        <h1 className="mb-2 text-2xl font-bold">{t.title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">{t.logoSection}</h2>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="preview" className="h-24 w-24 rounded-full object-cover border-2 border-primary" />
                  <button type="button" onClick={clearLogo} className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed bg-muted/30"><Upload className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <div className="flex-1">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  <Upload className="h-4 w-4" />{logoFile ? t.changeLogo : t.chooseLogo}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">{t.logoLimit}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t.nameLabel}</Label>
              <Input id="name" placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">{t.categoryLabel}</Label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">{t.categoryNone}</option>
                  {(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU8 && <>
                    <option value="U8">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU8}</option>
                    <option value="U10">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU10}</option>
                    <option value="U12">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU12}</option>
                    <option value="U14">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU14}</option>
                    <option value="U16">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU16}</option>
                    <option value="U18">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU18}</option>
                    <option value="U20">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catU20}</option>
                    <option value="Senior">{(teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar).catSenior}</option>
                  </>}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="season">{t.seasonLabel}</Label>
                <Input id="season" placeholder={t.seasonPlaceholder} value={season} onChange={(e) => setSeason(e.target.value)} disabled={loading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t.descriptionLabel}</Label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
            </div>
          </div>

          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{loading ? t.saving : t.save}</Button>
            <Link href="/dashboard/teams"><Button type="button" variant="outline" disabled={loading}>{t.cancel}</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
