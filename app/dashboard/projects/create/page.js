/* // app/dashboard/projects/create/page.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProjectsShell from "../ProjectsShell";
import { useUserOrg } from "../../DashboardShell";

// UI (proje yapına göre yolunu kontrol et)
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

// RPC dönüşünü (uuid | {project_id} | {id}) güvenle ayıkla
function extractProjectId(data) {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") return data.project_id || data.id || null;
  return null;
}

export default function CreateProjectPage() {
  const supabase = sbBrowser();

  // DashboardShell'den context (varsa)
  const orgCtx = (typeof useUserOrg === "function" ? useUserOrg() : null) || {};
  const ctxCompanyId = orgCtx.company_id || "";
  const ctxCompanyName = orgCtx.company_name || "";

  // Auth & şirket bilgisi
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(ctxCompanyId);
  const [companyName, setCompanyName] = useState(ctxCompanyName);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form
  const [projName, setProjName] = useState("");
  const [projArea, setProjArea] = useState("");
  const [projFloors, setProjFloors] = useState("");
  const [projLocation, setProjLocation] = useState("");
  const [projStartDate, setProjStartDate] = useState("");

  // UI feedback
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  // Kullanıcı + (gerekirse) şirket bilgisi oku
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoadingAuth(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (ignore) return;
      setUser(user ?? null);
      setLoadingAuth(false);

      // Context'ten şirket yoksa view'dan çek
      if (user && !ctxCompanyId) {
        const { data: row, error: vErr } = await supabase
          .from("v_user_context_json")
          .select("company_id, company_name")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!vErr && row?.company_id) {
          setCompanyId(row.company_id);
          setCompanyName(row.company_name ?? "");
        }
      }
    })();

    return () => { ignore = true; };
  }, [supabase, ctxCompanyId]);

  // Sayısal alanları güvenli çevir
  const numericArea = useMemo(() => (projArea ? Number(projArea) : null), [projArea]);
  const numericFloors = useMemo(() => (projFloors ? Number(projFloors) : null), [projFloors]);

  async function handleCreateProject() {
    setError(null);
    setNotice(null);
    setCreatedId(null);

    if (!user) {
      setError("Giriş yapmanız gerekiyor.");
      return;
    }
    if (!companyId) {
      setError("Şirket bilgisi bulunamadı (company_id).");
      return;
    }
    if (!projName.trim()) {
      setError("Proje adı zorunlu.");
      return;
    }

    setCreating(true);
    try {
      // 1) RPC: add_project_if_allowed
      const { data: rpcData, error: rpcErr } = await supabase.rpc("add_project_if_allowed", {
        p_company_id: companyId,
        // Öneri: Sunucu fonksiyonunda p_user_id'yi yoksay ve auth.uid() kullan.
        p_user_id: user.id,
        p_name: projName.trim(),
      });
      if (rpcErr) throw rpcErr;

      const newProjectId = extractProjectId(rpcData);
      if (!newProjectId) {
        setNotice("Proje oluşturuldu fakat project_id RPC sonucundan çıkarılamadı (return tipini kontrol edin).");
        return;
      }

      // 2) Opsiyonel alanlar: projects tablosunu güncelle
      const updates = {};
      if (numericArea !== null && Number.isFinite(numericArea)) updates.m2 = numericArea;
      if (numericFloors !== null && Number.isFinite(numericFloors)) updates.floor_count = numericFloors;
      if (projLocation.trim()) updates.location = projLocation.trim();
      if (projStartDate) updates.start_date = projStartDate; // 'YYYY-MM-DD'

      if (Object.keys(updates).length) {
        const { error: updErr } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", newProjectId);
        if (updErr) {
          // Hata verirse sadece kullanıcıyı bilgilendir (proje zaten açıldı)
          setNotice(`Proje oluşturuldu (ID: ${newProjectId}) fakat bazı alanlar güncellenemedi: ${updErr.message}`);
          setCreatedId(newProjectId);
          // Formu kısmen sıfırla
          setProjName("");
          return;
        }
      }

      setCreatedId(newProjectId);
      setNotice(`✅ Proje oluşturuldu. ID: ${newProjectId}`);

      // Formu temizle
      setProjName("");
      setProjArea("");
      setProjFloors("");
      setProjLocation("");
      setProjStartDate("");
    } catch (e) {
      console.error(e);
      setError(`Proje oluşturulamadı: ${e?.message || e}`);
    } finally {
      setCreating(false);
    }
  }

  const Header = () => (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İnşaat AI – Yeni Proje</h1>
        <p className="text-sm text-muted-foreground">
          {companyName ? `Şirket: ${companyName}` : (companyId ? `Şirket ID: ${companyId}` : "Şirket bilgisi yükleniyor…")}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {user
          ? `Kullanıcı: ${user.email ?? user.id}`
          : (loadingAuth ? "Giriş kontrol ediliyor…" : "Oturum yok")}
      </div>
    </div>
  );

  return (
    <ProjectsShell>
      <div className="space-y-6">
        <Header />

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700">{notice}</div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Proje Oluştur</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proje Adı *</Label>
              <Input
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Örn. Hürriyet 91. Sokak"
              />
            </div>

            <div className="space-y-2">
              <Label>Toplam Alan (m²)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={projArea}
                onChange={(e) => setProjArea(e.target.value)}
                placeholder="Örn. 8000"
              />
            </div>

            <div className="space-y-2">
              <Label>Kat Sayısı</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={projFloors}
                onChange={(e) => setProjFloors(e.target.value)}
                placeholder="Örn. 8"
              />
            </div>

            <div className="space-y-2">
              <Label>Konum</Label>
              <Input
                value={projLocation}
                onChange={(e) => setProjLocation(e.target.value)}
                placeholder="Mahalle / ilçe / şehir"
              />
            </div>

            <div className="space-y-2">
              <Label>Başlama Tarihi</Label>
              <Input
                type="date"
                value={projStartDate}
                onChange={(e) => setProjStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCreateProject}
                disabled={creating}
                className="w-full md:w-auto"
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Projeyi Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>

        {createdId && (
          <div className="text-xs text-muted-foreground">
            Kurucu kullanıcı, <code>project_members</code> tablosuna <b>role='patron'</b>, <b>status='active'</b> olarak eklenmiş olmalıdır
            (bunu <code>add_project_if_allowed</code> veya tetikleyici yapar).
          </div>
        )}
      </div>
    </ProjectsShell>
  );
}
 */


// app/dashboard/projects/create/page.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProjectsShell from "../ProjectsShell";
import { useUserOrg } from "../../DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Loader2, Building2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

function sbBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createBrowserClient(url ?? "", anon ?? "");
}

function extractProjectId(data) {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") return data.project_id || data.id || null;
  return null;
}

export default function CreateProjectPage() {
  const supabase = sbBrowser();

  const orgCtx = (typeof useUserOrg === "function" ? useUserOrg() : null) || {};
  const ctxCompanyId = orgCtx.company_id || "";
  const ctxCompanyName = orgCtx.company_name || "";
  const ctxCompanyRole = orgCtx.company_role || "";

  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(ctxCompanyId);
  const [companyName, setCompanyName] = useState(ctxCompanyName);
  const [companyRole, setCompanyRole] = useState(ctxCompanyRole);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [projName, setProjName] = useState("");
  const [projArea, setProjArea] = useState("");
  const [projFloors, setProjFloors] = useState("");
  const [projLocation, setProjLocation] = useState("");
  const [projStartDate, setProjStartDate] = useState("");

  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingAuth(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (ignore) return;
      setUser(user ?? null);
      setLoadingAuth(false);

      // context yoksa bir kez view’dan çek
      if (user && (!ctxCompanyId || !ctxCompanyRole)) {
        const { data: row } = await supabase
          .from("v_user_context_json")
          .select("company_id, company_name, company_role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (row?.company_id) {
          setCompanyId(row.company_id);
          setCompanyName(row.company_name ?? "");
          setCompanyRole(row.company_role ?? "");
        }
      }
    })();
    return () => { ignore = true; };
  }, [supabase, ctxCompanyId, ctxCompanyRole]);

  const canCreate = companyRole === "patron";

  const numericArea = useMemo(() => (projArea ? Number(projArea) : null), [projArea]);
  const numericFloors = useMemo(() => (projFloors ? Number(projFloors) : null), [projFloors]);

  async function handleCreateProject() {
    setError(null);
    setNotice(null);
    setCreatedId(null);

    if (!user) return setError("Giriş yapmanız gerekiyor.");
    if (!companyId) return setError("Şirket bilgisi bulunamadı (company_id).");
    if (!projName.trim()) return setError("Proje adı zorunlu.");
    if (!canCreate) return setError("Sadece patron proje oluşturabilir.");

    setCreating(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("add_project_if_allowed", {
        p_company_id: companyId,
        p_user_id: user.id,
        p_name: projName.trim(),
        p_m2: numericArea,
        p_floor_count: numericFloors,
        p_location: projLocation.trim() || null,
        p_start_date: projStartDate || null,
      });
      if (rpcErr) throw rpcErr;

      const newProjectId = extractProjectId(rpcData);
      if (!newProjectId) {
        setNotice("Proje oluşturuldu fakat project_id RPC sonucundan çıkarılamadı.");
        return;
      }

      setCreatedId(newProjectId);
      setNotice(`✅ Proje oluşturuldu. ID: ${newProjectId}`);
      setProjName(""); setProjArea(""); setProjFloors(""); setProjLocation(""); setProjStartDate("");
    } catch (e) {
      console.error(e);
      setError(`Proje oluşturulamadı: ${e?.message || e}`);
    } finally {
      setCreating(false);
    }
  }

  const Header = () => (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İnşaat AI – Yeni Proje</h1>
        <p className="text-sm text-muted-foreground">
          {companyName ? `Şirket: ${companyName}` : (companyId ? `Şirket ID: ${companyId}` : "Şirket bilgisi yükleniyor…")}
          {companyRole ? ` • Rolünüz: ${companyRole}` : ""}
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        {user ? `Kullanıcı: ${user.email ?? user.id}` : (loadingAuth ? "Giriş kontrol ediliyor…" : "Oturum yok")}
      </div>
    </div>
  );

  if (user && companyId && !canCreate) {
    return (
      <ProjectsShell>
        <Header />
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          Sadece <b>patron</b> proje oluşturabilir. Mevcut rolünüz: <b>{companyRole || "bilinmiyor"}</b>.
        </div>
      </ProjectsShell>
    );
  }

  return (
    <ProjectsShell>
      <div className="space-y-6">
        <Header />

        {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700">{notice}</div>}
        {error &&  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}

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

        {createdId && (
          <div className="text-xs text-muted-foreground">
            Kurucu kullanıcı <code>project_members</code> tablosuna <b>patron/active</b> olarak eklendi.
          </div>
        )}
      </div>
    </ProjectsShell>
  );
}
