"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NewProjectPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // form
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [m2, setM2] = useState("");
  const [location, setLocation] = useState("");
  const [floorCount, setFloorCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // kullanıcı & şirketleri
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]); // {id, name, role}

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      // 1) user
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr || !ures?.user) {
        setMsg("Oturum bulunamadı. Lütfen giriş yapın.");
        setLoading(false);
        return;
      }
      setUser(ures.user);

      // 2) kullanıcının şirketleri + rolü
      // RLS: company_member.select -> self; company.select -> is_member/owner
      const { data: cms, error: cmErr } = await supabase
        .from("company_member")
        .select(
          `
          company_id,
          role,
          company:company_id ( id, name )
        `
        )
        .eq("user_id", ures.user.id);

      if (cmErr) {
        setMsg("Şirketler yüklenemedi.");
        setLoading(false);
        return;
      }

      const mapped =
        cms?.map((r) => ({
          id: r.company?.id,
          name: r.company?.name,
          role: r.role, // patron | yonetici | calisan
        })) ?? [];

      setCompanies(mapped);

      // hiç şirket yoksa onboarding'e yönlendir
      if (mapped.length === 0) {
        router.replace("/onboarding"); // burada şirket oluşturma/davet akışın var
        return;
      }

      // tek şirket varsa otomatik seç
      if (mapped.length === 1 && mapped[0]?.id) {
        setCompanyId(mapped[0].id);
      }

      setLoading(false);
    })();
  }, [router]);

  const myRoleOnSelectedCompany = useMemo(() => {
    return companies.find((c) => c.id === companyId)?.role || null;
  }, [companies, companyId]);

  const canCreate =
    myRoleOnSelectedCompany === "patron" || myRoleOnSelectedCompany === "yonetici";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!companyId) {
      setMsg("Lütfen şirket seçin.");
      return;
    }
    if (!canCreate) {
      setMsg("Bu şirkette proje oluşturma yetkiniz yok (patron/ yönetici olmalısınız).");
      return;
    }
    if (!name.trim()) {
      setMsg("Proje adı zorunludur.");
      return;
    }

    setSaving(true);
    try {
      // 1) Proje oluştur
      const payload = {
        company_id: companyId,
        name: name.trim(),
        description: description || null,
        m2: m2 ? Number(m2) : null,
        location: location || null,
        floor_count: floorCount ? Number(floorCount) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: user.id,
        // currency kolonu DB'de TRY default ise göndermeye gerek yok
      };

      const { data: created, error: cErr } = await supabase
        .from("projects")
        .insert([payload])
        .select("id")
        .single();

      if (cErr) throw cErr;

      const projectId = created.id;

      // 2) Proje üyeliği (rol, şirket rolünle aynı)
      const { error: pmErr } = await supabase.from("project_members").insert([
        {
          project_id: projectId,
          company_id: companyId, // trigger da dolduruyor ama açık göndermek OK
          user_id: user.id,
          role: myRoleOnSelectedCompany, // patron / yonetici / calisan
        },
      ]);
      if (pmErr) throw pmErr;

      setMsg("✅ Proje oluşturuldu, yönlendiriliyorsunuz...");
      router.replace(`/projects/${projectId}`); // kendi proje detay sayfan
    } catch (err) {
      console.error(err);
      setMsg("❌ Proje oluşturulamadı: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p>Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded-2xl shadow w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Yeni Proje</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Şirket seçimi */}
          <div>
            <label className="block text-sm mb-1">Şirket</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Seçin…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.role ? `• (${c.role})` : ""}
                </option>
              ))}
            </select>
            {!canCreate && companyId && (
              <p className="text-xs text-amber-600 mt-1">
                Bu şirkette proje oluşturma yetkiniz yok (patron/ yönetici olmalısınız).
              </p>
            )}
          </div>

          <input
            type="text"
            placeholder="Proje adı *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />

          <input
            type="text"
            placeholder="Konum"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="m²"
              value={m2}
              onChange={(e) => setM2(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              min="0"
            />
            <input
              type="number"
              placeholder="Kat sayısı"
              value={floorCount}
              onChange={(e) => setFloorCount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              placeholder="Başlangıç"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="date"
              placeholder="Bitiş"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <textarea
            placeholder="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />

          <button
            type="submit"
            disabled={saving || !companyId || !name || !canCreate}
            className={`w-full py-2 rounded-lg text-white ${
              saving || !companyId || !name || !canCreate
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-slate-900 hover:opacity-90"
            }`}
          >
            {saving ? "Kaydediliyor..." : "Proje Oluştur"}
          </button>
        </form>

        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}
      </div>
    </div>
  );
}
