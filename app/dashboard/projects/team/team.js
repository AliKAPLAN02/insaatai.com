// app/dashboard/projects/team/page.js
"use client";

import React, { useEffect, useState } from "react";
import ProjectsShell from "../ProjectsShell";
import { useUserOrg } from "../../DashboardShell";

// UI (relative: projene göre kontrol et)
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Loader2, Users2, UserPlus, Send } from "lucide-react";

// Supabase (browser)
import { createBrowserClient } from "@supabase/ssr";
function sbBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createBrowserClient(url ?? "", anon ?? "");
}

export default function TeamAndPartnersPage() {
  const supabase = sbBrowser();
  const { company_id: myCompanyId, company_name: myCompanyName } = useUserOrg();

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Projeler (kullanıcının approved olduğu)
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Kendi şirket çalışanları
  const [companyMembers, setCompanyMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Partner şirketler (kendi şirketin hariç)
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [inviteDays, setInviteDays] = useState(7);

  // UI feedback
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  /* AUTH */
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

  /* Projeleri yükle (approved) */
  const refreshProjects = async () => {
    if (!user) return;
    setProjectsLoading(true);
    setError(null);
    try {
      const { data: pmRows, error: pmErr } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (pmErr) throw pmErr;

      const ids = Array.from(new Set((pmRows ?? []).map(r => r.project_id))).filter(Boolean);
      if (!ids.length) {
        setProjects([]); setSelectedProjectId(""); setProjectsLoading(false); return;
      }

      const { data: prjRows, error: prjErr } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", ids);
      if (prjErr) throw prjErr;

      const rows = prjRows ?? [];
      setProjects(rows);
      if (rows.length && !selectedProjectId) setSelectedProjectId(String(rows[0].id));
    } catch (e) {
      console.error(e);
      setError(`Projeler yüklenemedi: ${e?.message || e}`);
    } finally {
      setProjectsLoading(false);
    }
  };
  useEffect(() => { refreshProjects(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [user]);

  /* Kendi çalışanların */
  const refreshMembers = async () => {
    if (!myCompanyId) return;
    setMembersLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("company_member")
        .select("user_id, profiles(full_name, email)")
        .eq("company_id", myCompanyId);
      if (error) throw error;

      const rows = (data || []).map(r => ({
        user_id: r.user_id,
        full_name: r.profiles?.full_name ?? null,
        email: r.profiles?.email ?? null,
      }));
      const filtered = user ? rows.filter(m => m.user_id !== user.id) : rows;
      setCompanyMembers(filtered);
    } catch (e) {
      console.error(e);
      setError(`Çalışanlar yüklenemedi: ${e?.message || e}`);
    } finally {
      setMembersLoading(false);
    }
  };
  useEffect(() => { refreshMembers(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [myCompanyId]);

  /* Partner şirketler */
  const refreshCompanies = async () => {
    setCompaniesLoading(true);
    setError(null);
    try {
      let query = supabase.from("company").select("id, name");
      if (myCompanyId) query = query.neq("id", myCompanyId);
      const { data, error } = await query.order("name", { ascending: true });
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

  /* Çalışan ekle */
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
        p_default_role: "member",
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

  /* Partner daveti */
  const [inviting, setInviting] = useState(false);
  const handleInvitePartners = async () => {
    if (!selectedProjectId) return setError("Lütfen bir proje seçin.");
    if (!selectedCompanyIds.length) return setError("En az bir partner şirket seçin.");

    setInviting(true);
    setError(null); setNotice(null);
    try {
      const { error } = await supabase.rpc("invite_partner_companies_owner", {
        p_project_id: selectedProjectId,
        p_company_ids: selectedCompanyIds,
        p_expire_days: inviteDays,
      });
      if (error) throw error;
      setNotice("Partner daveti gönderildi. Patronların e-posta onayı bekleniyor (outbox).");
      setSelectedCompanyIds([]);
    } catch (e) {
      console.error(e);
      setError(`Davet gönderilemedi: ${e?.message || e}`);
    } finally {
      setInviting(false);
    }
  };

  const Header = () => (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İnşaat AI – Çalışan & Partner Ekle</h1>
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

        {/* Proje seç */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Üzerinde Çalışılacak Proje</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Proje Seç</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder={projectsLoading ? "Yükleniyor…" : "Bir proje seçiniz"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
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
              <div className="text-sm text-muted-foreground">Şirket çalışanları ({companyMembers.length})</div>
              <Button variant="outline" size="sm" onClick={refreshMembers} disabled={membersLoading}>
                {membersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Listeyi Yenile
              </Button>
            </div>

            {companyMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground">Şirketinize bağlı çalışan bulunamadı.</div>
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
                          setSelectedMemberIds((prev) => val ? [...prev, m.user_id] : prev.filter(x => x !== m.user_id));
                        }}
                      />
                      <div>
                        <div className="font-medium">{m.full_name || "(İsim yok)"}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddMembers} disabled={addingMembers || selectedMemberIds.length === 0}>
                {addingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users2 className="mr-2 h-4 w-4" />}
                Seçilenleri Ekle
              </Button>
              <Button variant="ghost" onClick={() => setSelectedMemberIds([])} disabled={!selectedMemberIds.length}>
                Seçimi Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Partner daveti */}
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

            {companies.length === 0 ? (
              <div className="text-sm text-muted-foreground">Davet edebileceğiniz başka şirket bulunamadı.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companies.map((c) => {
                  const checked = selectedCompanyIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const val = Boolean(v);
                          setSelectedCompanyIds((prev) => val ? [...prev, c.id] : prev.filter(x => x !== c.id));
                        }}
                      />
                      <div className="font-medium">{c.name}</div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Davet Geçerlilik (gün)</Label>
                <Input type="number" min={1} value={inviteDays} onChange={(e) => setInviteDays(parseInt(e.target.value || "7", 10))} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleInvitePartners} disabled={inviting || selectedCompanyIds.length === 0} className="w-full md:w-auto">
                  {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Davet Gönder
                </Button>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => setSelectedCompanyIds([])} disabled={!selectedCompanyIds.length} className="w-full md:w-auto">
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
