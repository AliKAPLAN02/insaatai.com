// app/dashboard/projects/create/page.js
"use client";

import React, { useEffect, useState } from "react";
import ProjectsShell from "../ProjectsShell";
import { useUserOrg } from "../../DashboardShell";

// UI (relative: projene göre kontrol et)
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Loader2, Building2 } from "lucide-react";

// Supabase (browser)
import { createBrowserClient } from "@supabase/ssr";
function sbBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createBrowserClient(url ?? "", anon ?? "");
}

export default function CreateProjectPage() {
  const supabase = sbBrowser();
  const { company_id: myCompanyId, company_name: myCompanyName } = useUserOrg();

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form
  const [projName, setProjName] = useState("");
  const [projArea, setProjArea] = useState("");
  const [projFloors, setProjFloors] = useState("");
  const [projLocation, setProjLocation] = useState("");
  const [projStartDate, setProjStartDate] = useState("");
  const [creating, setCreating] = useState(false);

  // UI feedback
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  // Auth
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingAuth(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!ignore) {
        setUser(user ?? null);
        setLoadingAuth(false);
      }
    })();
    return () => { ignore = true; };
  }, [supabase]);

  // Create
  const handleCreateProject = async () => {
    setError(null);
    setNotice(null);

    if (!projName) return setError("Proje adı zorunlu.");
    if (!myCompanyId || !user?.id) return setError("Şirket veya kullanıcı bilgisi eksik.");

    setCreating(true);
    try {
      // 1) RPC: add_project_if_allowed
      const { data: created, error: createErr } = await supabase.rpc("add_project_if_allowed", {
        p_company_id: myCompanyId,
        p_user_id: user.id,
        p_name: projName,
      });
      if (createErr) throw createErr;

      const newProjectId = (created && created.project_id) || created || null;
      if (!newProjectId) {
        setNotice("Proje oluşturuldu, ancak project_id okunamadı (RPC dönüşünü kontrol edin).");
        return;
      }

      // 2) Projects UPDATE (opsiyonel alanlar)
      const updates = {};
      if (projArea) updates.m2 = Number(projArea);
      if (projFloors) updates.floor_count = Number(projFloors);
      if (projLocation) updates.location = projLocation;
      if (projStartDate) updates.start_date = projStartDate;

      if (Object.keys(updates).length) {
        const { error: updErr } = await supabase.from("projects").update(updates).eq("id", newProjectId);
        if (updErr) throw updErr;
      }

      setNotice("✅ Proje başarıyla oluşturuldu.");
      // Form temizle
      setProjName(""); setProjArea(""); setProjFloors(""); setProjLocation(""); setProjStartDate("");
    } catch (e) {
      console.error(e);
      setError(`Proje oluşturulamadı: ${e?.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  const Header = () => (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İnşaat AI – Yeni Proje</h1>
        <p className="text-sm text-muted-foreground">
          {myCompanyName ? `Şirket: ${myCompanyName}` : "Şirket bilgisi yükleniyor…"}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {user ? `Kullanıcı: ${user.email}` : (loadingAuth ? "Giriş kontrol ediliyor…" : "Oturum yok")}
      </div>
    </div>
  );

  return (
    <ProjectsShell>
      <div className="space-y-6">
        <Header />
        {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700">{notice}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}

        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Proje Oluştur</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proje Adı *</Label>
              <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Örn. Hürriyet 91. Sokak" />
            </div>
            <div className="space-y-2">
              <Label>Toplam Alan (m²)</Label>
              <Input type="number" inputMode="decimal" value={projArea} onChange={(e) => setProjArea(e.target.value)} placeholder="Örn. 8000" />
            </div>
            <div className="space-y-2">
              <Label>Kat Sayısı</Label>
              <Input type="number" inputMode="numeric" value={projFloors} onChange={(e) => setProjFloors(e.target.value)} placeholder="Örn. 8" />
            </div>
            <div className="space-y-2">
              <Label>Konum</Label>
              <Input value={projLocation} onChange={(e) => setProjLocation(e.target.value)} placeholder="Mahalle / ilçe / şehir" />
            </div>
            <div className="space-y-2">
              <Label>Başlama Tarihi</Label>
              <Input type="date" value={projStartDate} onChange={(e) => setProjStartDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateProject} disabled={creating} className="w-full md:w-auto">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Projeyi Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectsShell>
  );
}
