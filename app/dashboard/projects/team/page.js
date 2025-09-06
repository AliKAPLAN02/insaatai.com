// app/dashboard/projects/team/page.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProjectsShell from "../ProjectsShell";
import { useUserOrg } from "../../DashboardShell";
import { sbBrowser } from "@/lib/supabaseBrowserClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users2, UserPlus, Send } from "lucide-react";

/* ------------------------- Helpers ------------------------- */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseManualIds(text) {
  return Array.from(
    new Set(
      (text || "")
        .split(/[\s,;]+/)
        .map((t) => t.trim())
        .filter((t) => t && UUID_V4.test(t))
    )
  );
}
/* ----------------------------------------------------------- */

export default function TeamAndPartnersPage() {
  const supabase = useMemo(() => sbBrowser(), []);
  const { company_id: myCompanyId, company_name: myCompanyName } = useUserOrg();

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Projeler
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Şirket çalışanları
  const [companyMembers, setCompanyMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Partner şirketler (opsiyonel liste)
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Manuel company_id girişi
  const [manualCompanyIds, setManualCompanyIds] = useState("");

  // Diğer UI
  const [inviteDays, setInviteDays] = useState(7);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  /* ----------------------------- AUTH ------------------------------ */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingAuth(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!ignore) {
        if (error) console.error("[team] getUser:", error);
        setUser(user ?? null);
        setLoadingAuth(false);
      }
    })();
    return () => { ignore = true; };
  }, [supabase]);

  /* ------ PROJELER: (A) aktif üyelikler + (B) kendi şirket projelerin ------ */
  const refreshProjects = async () => {
    if (!user && !myCompanyId) return;
    setProjectsLoading(true);
    setError(null);
    try {
      // A) aktif üyesi olduğun projelerden id'ler
      let memberProjectIds = [];
      if (user) {
        const { data: pmRows, error: pmErr } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", user.id)
          .eq("status", "active");
        if (pmErr) throw pmErr;
        memberProjectIds = Array.from(new Set((pmRows ?? []).map((r) => r.project_id))).filter(Boolean);
      }

      // B) iki ayrı sorgu → sonra birleştir & tekilleştir
      const promises = [];
      if (myCompanyId) {
        promises.push(
          supabase.from("projects").select("id, name").eq("company_id", myCompanyId)
        );
      }
      if (memberProjectIds.length) {
        promises.push(
          supabase.from("projects").select("id, name").in("id", memberProjectIds)
        );
      }

      let combined = [];
      if (promises.length) {
        const results = await Promise.all(promises);
        for (const r of results) {
          if (r.error) throw r.error;
          combined = combined.concat(r.data || []);
        }
      }

      // tekilleştir (id'ye göre) ve ada göre sırala
      const map = new Map();
      for (const row of combined) map.set(row.id, row);
      const rows = Array.from(map.values()).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      setProjects(rows);
      if (rows.length && !selectedProjectId) setSelectedProjectId(String(rows[0].id));
      if (!rows.length) setSelectedProjectId("");
    } catch (e) {
      console.error(e);
      setError(`Projeler yüklenemedi: ${e?.message || e}`);
    } finally {
      setProjectsLoading(false);
    }
  };
  useEffect(() => { refreshProjects(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [user, myCompanyId]);

  /* ----------------------- ŞİRKET ÇALIŞANLARI (RPC) ---------------------- */
  const refreshMembers = async () => {
    if (!myCompanyId) return;
    setMembersLoading(true);
    setError(null);
    try {
      // Tercih edilen: RPC (company_members_list). Yoksa tabloyu oku (fallback).
      let rows = [];
      const { data, error } = await supabase.rpc("company_members_list", { p_company_id: myCompanyId });
      if (error && error.message?.toLowerCase().includes("does not exist")) {
        const fb = await supabase
          .from("company_member")
          .select("user_id, role")
          .eq("company_id", myCompanyId);
        if (fb.error) throw fb.error;
        rows = fb.data || [];
      } else if (error) {
        throw error;
      } else {
        rows = data || [];
      }

      const mapped = (rows || []).map((r) => ({
        user_id: r.user_id,
        role: r.role ?? null,       // 'patron' | 'yonetici' | 'calisan' (beklenen)
        email: r.email ?? null,
        full_name: r.full_name ?? null,
      }));

      // 🔒 Patronları VE (önlem olarak) mevcut kullanıcıyı gizle
      const filtered = (mapped || [])
        .filter((m) => m.role !== "patron")
        .filter((m) => (user ? m.user_id !== user.id : true));

      setCompanyMembers(filtered);
    } catch (e) {
      console.error(e);
      setError(`Çalışanlar yüklenemedi: ${e?.message || e}`);
    } finally {
      setMembersLoading(false);
    }
  };
  useEffect(() => { refreshMembers(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [myCompanyId]);

  /* --------------- PARTNER ŞİRKETLER (opsiyonel liste) -------------- */
  const refreshCompanies = async () => {
    setCompaniesLoading(true);
    setError(null);
    try {
      let q = supabase.from("company").select("id, name");
      if (myCompanyId) q = q.neq("id", myCompanyId);
      const { data, error } = await q.order("name", { ascending: true });
      if (error) throw error;
      setCompanies(data || []);
    } catch (e) {
      console.error(e);
      setError(`Şirket listesi yüklenemedi: ${e?.message || e}`);
    } finally {
      setCompaniesLoading(false);
    }
  };
  useEffect(() => { refreshCompanies(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [myCompanyId]);

  /* ----------------------- ÇALIŞAN EKLE (bulk) ---------------------- */
  const [addingMembers, setAddingMembers] = useState(false);
  const handleAddMembers = async () => {
    if (!selectedProjectId) return setError("Lütfen bir proje seçin.");
    if (!myCompanyId) return setError("Şirket bilgisi eksik.");
    if (!selectedMemberIds.length) return setError("En az bir çalışan seçin.");

    setAddingMembers(true);
    setError(null); setNotice(null);
    try {
      const { error } = await supabase.rpc("add_project_members_bulk", {
        p_project_id: selectedProjectId,
        p_company_id: myCompanyId,
        p_user_ids: selectedMemberIds,
        p_default_role: "calisan", // ✅ TR rolü (ASCII)
      });
      if (error) throw error;
      setNotice("Çalışan(lar) projeye eklendi.");
      setSelectedMemberIds([]);
    } catch (e) {
      console.error(e);
      setError(`Çalışan eklenemedi: ${e?.message || e}`);
    } finally {
      setAddingMembers(false);
    }
  };

  /* ------------- PARTNER DAVETİ (şirket sahiplerine) --------------- */
  const [inviting, setInviting] = useState(false);
  const handleInvitePartners = async () => {
    if (!selectedProjectId) return setError("Lütfen bir proje seçin.");

    // listeden + manuel girilenleri birleştir
    const manualIds = parseManualIds(manualCompanyIds);
    let merged = Array.from(new Set([...(selectedCompanyIds || []), ...manualIds]));

    // Kendi şirketini davet etme (güvenlik için filtrele)
    if (myCompanyId) merged = merged.filter((id) => id !== myCompanyId);

    if (merged.length === 0) {
      return setError("En az bir geçerli company_id girin veya listeden seçin.");
    }

    setInviting(true);
    setError(null); setNotice(null);
    try {
      const { error } = await supabase.rpc("invite_partner_companies_owner", {
        p_project_id: selectedProjectId,
        p_company_ids: merged,
        p_expire_days: Number.isFinite(+inviteDays) ? +inviteDays : 7,
      });
      if (error) throw error;

      setNotice(`Partner daveti gönderildi (${merged.length} şirket). Patronların e-posta onayı bekleniyor (outbox).`);
      setSelectedCompanyIds([]);
      setManualCompanyIds("");
    } catch (e) {
      console.error(e);
      setError(`Davet gönderilemedi: ${e?.message || e}`);
    } finally {
      setInviting(false);
    }
  };

  const inviteDisabled = inviting
    || !selectedProjectId
    || (selectedCompanyIds.length === 0 && parseManualIds(manualCompanyIds).length === 0);

  /* ------------------------------ UI -------------------------------- */
  const Header = () => (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İnşaat AI – Çalışan & Partner Ekle</h1>
        <p className="text-sm text-muted-foreground">
          {myCompanyName ? `Şirket: ${myCompanyName}` : "Şirket bilgisi yükleniyor…"}
        </p>
      </div>
    </div>
  );

  return (
    <ProjectsShell>
      <div className="space-y-6">
        <Header />

        {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700">{notice}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}

        {/* Proje seç */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Üzerinde Çalışılacak Proje</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Proje Seç</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={projectsLoading ? "Yükleniyor…" : "Bir proje seçiniz"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={refreshProjects} disabled={projectsLoading} className="w-full md:w-auto">
                {projectsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Projeleri Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Çalışan ekle */}
        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Projeye Çalışan Ekle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                Şirket çalışanları ({companyMembers.length}) <span className="ml-2 opacity-70">(patron listeden gizlendi)</span>
              </div>
              <Button variant="outline" size="sm" onClick={refreshMembers} disabled={membersLoading}>
                {membersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Listeyi Yenile
              </Button>
            </div>

            {companyMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground">Şirketinize bağlı uygun çalışan bulunamadı.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companyMembers.map((m) => {
                  const checked = selectedMemberIds.includes(m.user_id);
                  return (
                    <label key={m.user_id} className="flex items-start gap-3 rounded-xl border p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const val = Boolean(v);
                          setSelectedMemberIds((prev) => (val ? [...prev, m.user_id] : prev.filter((x) => x !== m.user_id)));
                        }}
                      />
                      <div>
                        <div className="font-medium">{m.email || m.full_name || m.user_id}</div>
                        <div className="text-xs text-muted-foreground">{m.role ? `rol: ${m.role}` : ""}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddMembers} disabled={addingMembers || selectedMemberIds.length === 0 || !selectedProjectId}>
                {addingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users2 className="mr-2 h-4 w-4" />}
                Seçilenleri Ekle
              </Button>
              <Button variant="ghost" onClick={() => setSelectedMemberIds([])} disabled={!selectedMemberIds.length}>
                Seçimi Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Partner daveti — manuel company_id giriş destekli */}
        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <CardTitle>Partner Daveti Gönder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Partner şirketler ({companies.length})</div>
              <Button variant="outline" size="sm" onClick={refreshCompanies} disabled={companiesLoading}>
                {companiesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Listeyi Yenile
              </Button>
            </div>

            {companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companies.map((c) => {
                  const checked = selectedCompanyIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const val = Boolean(v);
                          setSelectedCompanyIds((prev) => (val ? [...prev, c.id] : prev.filter((x) => x !== c.id)));
                        }}
                      />
                      <div className="font-medium">{c.name}</div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Liste boş olabilir (RLS). Aşağıdan <strong>company_id</strong> girerek davet gönderebilirsiniz.
              </div>
            )}

            {/* Manuel ID girişi (çoklu) */}
            <div className="space-y-2">
              <Label>Company ID (bir veya birden çok)</Label>
              <Input
                placeholder="UUID v4… Örn: 123e4567-e89b-12d3-a456-426614174000, 1b2c… (virgül/boşluk/alt satırla ayırın)"
                value={manualCompanyIds}
                onChange={(e) => setManualCompanyIds(e.target.value)}
              />
              {manualCompanyIds.trim() && (
                <div className="text-xs text-muted-foreground">
                  Geçerli ID sayısı: {parseManualIds(manualCompanyIds).length}
                  {myCompanyId && parseManualIds(manualCompanyIds).includes(myCompanyId) ? " (kendi şirketiniz filtrelenecek)" : ""}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Davet Geçerlilik (gün)</Label>
                <Input
                  type="number"
                  min={1}
                  value={inviteDays}
                  onChange={(e) => setInviteDays(parseInt(e.target.value || "7", 10))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleInvitePartners} disabled={inviteDisabled} className="w-full md:w-auto">
                  {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Davet Gönder
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedCompanyIds([]);
                    setManualCompanyIds("");
                  }}
                  disabled={selectedCompanyIds.length === 0 && manualCompanyIds.trim() === ""}
                  className="w-full md:w-auto"
                >
                  Seçimi Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground pt-2">
          Not: E-posta gönderimi outbox + mailer üzerinden yapılır. Onay/red linklerini App Router
          <code> /api/invite/accept </code> ve <code> /api/invite/reject </code> route'larında ele al.
        </div>
      </div>
    </ProjectsShell>
  );
}
