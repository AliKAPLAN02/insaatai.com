"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NewProjectPage() {
  const router = useRouter();

  // form fields
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [m2, setM2] = useState("");
  const [floorCount, setFloorCount] = useState("");
  const [description, setDescription] = useState("");

  // ui state
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");

  // Şirketleri otomatik getir (RLS sadece kendi şirketlerini döndürür)
  useEffect(() => {
    (async () => {
      setLoadErr("");
      const { data, error } = await supabase
        .from("company")
        .select("id,name")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadErr("Şirketler yüklenemedi.");
        return;
      }

      const rows = data || [];
      setCompanies(rows);

      if (rows.length === 1) {
        setCompanyId(rows[0].id);
        setCompanyName(rows[0].name);
      } else if (rows.length > 1) {
        // Son seçilen şirketi hatırla (opsiyonel)
        const last = typeof window !== "undefined"
          ? localStorage.getItem("last_company_id")
          : null;
        const found = rows.find((r) => r.id === last);
        if (found) {
          setCompanyId(found.id);
          setCompanyName(found.name);
        }
      }
    })();
  }, []);

  // dropdown’da seçim değişirse adı da güncelle ve LS’ye yaz
  useEffect(() => {
    if (!companyId) return;
    const found = companies.find((c) => c.id === companyId);
    if (found) {
      setCompanyName(found.name);
      try { localStorage.setItem("last_company_id", found.id); } catch {}
    }
  }, [companyId, companies]);

  const disabled = useMemo(
    () => loading || !companyId || !name.trim(),
    [loading, companyId, name]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setMsg("");
    setLoading(true);

    try {
      const m2Num =
        m2.trim() === "" ? null : Number(m2.replace(",", "."));
      const floorNum =
        floorCount.trim() === "" ? null : parseInt(floorCount, 10);

      // 1) Proje
      const { data: created, error: insErr } = await supabase
        .from("projects")
        .insert([
          {
            company_id: companyId,
            name: name.trim(),
            description: description.trim() || null,
            m2: Number.isFinite(m2Num) ? m2Num : null,
            location: location.trim() || null,
            floor_count: Number.isInteger(floorNum) ? floorNum : null,
            // start_date DB default: today, end_date gönderme
          },
        ])
        .select("id")
        .single();

      if (insErr) {
        setMsg("❌ Proje oluşturulamadı: " + insErr.message);
        return;
      }

      // 2) Kurucuyu projeye üye ekle (idempotent)
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id;
      if (uid && created?.id) {
        await supabase
          .from("project_members")
          .insert([{ project_id: created.id, user_id: uid, role: "yonetici" }])
          .then(() => {})
          .catch(() => {}); // varsa geç
      }

      setMsg("✅ Proje oluşturuldu.");
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Şirket alanı (tek şirketse readonly göster, çoksa selector)
  const CompanyField = () => {
    if (companies.length === 0) {
      return (
        <div>
          <label className="block text-sm font-medium mb-1">Şirket</label>
          <input
            className="w-full rounded-lg border px-3 py-2 bg-gray-100"
            value="Şirket bulunamadı — önce şirket oluşturun."
            readOnly
          />
        </div>
      );
    }

    if (companies.length === 1) {
      return (
        <div>
          <label className="block text-sm font-medium mb-1">Şirket</label>
          <input
            className="w-full rounded-lg border px-3 py-2 bg-gray-50"
            value={companyName || ""}
            readOnly
          />
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium mb-1">Şirket</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        >
          <option value="">Seçin...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-center mb-8">Yeni Proje</h1>

        {loadErr && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {loadErr}
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <CompanyField />

          <div>
            <label className="block text-sm font-medium mb-1">Proje adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Örn: A Blok Kentsel Dönüşüm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Konum</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="İl / İlçe / Mahalle"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">m²</label>
              <input
                inputMode="decimal"
                value={m2}
                onChange={(e) => setM2(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Örn: 1200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kat sayısı</label>
              <input
                inputMode="numeric"
                value={floorCount}
                onChange={(e) => setFloorCount(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Örn: 6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="İsteğe bağlı not"
              rows={4}
            />
          </div>

          <button
            type="submit"
            disabled={disabled || companies.length === 0}
            className={`w-full rounded-lg px-4 py-2 text-white ${
              disabled || companies.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-slate-900 hover:opacity-90"
            }`}
          >
            {loading ? "Oluşturuluyor..." : "Proje Oluştur"}
          </button>
        </form>

        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}
      </div>
    </div>
  );
}
