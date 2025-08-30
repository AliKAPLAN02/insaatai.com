// app/dashboard/treasury/page.js
"use client";

/**
 * Bu sayfa:
 * - Kullanıcının şirketini (patron ya da üye olarak) bulur ve gösterir
 * - Şirket yoksa oluşturma formu sunar
 * - Hazine (initial_budget) güncelleme akışını sağlar
 *
 * Önemli notlar:
 * - Plan enum değerleri veritabanında TÜRKÇE: "Deneme Sürümü", "Başlangıç", "Profesyonel", "Kurumsal"
 * - RPC create_company_with_owner(p_user_id uuid, p_name text, p_plan billing_plan) çağrılır; hata olursa fallback insert yapılır.
 * - company_member fallback insert’inde rol = 'patron'
 */

import { useEffect, useState } from "react";
import DashboardShell from "../DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, Building2 } from "lucide-react";

const TURKISH_PLANS = [
  "Deneme Sürümü",
  "Başlangıç",
  "Profesyonel",
  "Kurumsal",
];

export default function TreasuryPage() {
  const [user, setUser] = useState(null);

  // Şirket durumu
  const [company, setCompany] = useState(null); // {id, name, initial_budget, currency, patron}
  const [cName, setCName] = useState("");
  const [cPlan, setCPlan] = useState("Deneme Sürümü"); // 🔹 Türkçe default
  const [creating, setCreating] = useState(false);

  // Hazine formu
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");

  // ------------------------------------------------------------
  // Oturum ve şirketi getir
  // ------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures?.user) return;
      setUser(ures.user);

      // 1) Kullanıcının patron olduğu şirketi getir
      const { data: owned, error: ownErr } = await supabase
        .from("company")
        .select("id,name,initial_budget,currency,patron,plan")
        .eq("patron", ures.user.id)
        .maybeSingle();

      if (owned && !ownErr) {
        setCompany(owned);
        setCurrency(owned.currency || "TRY");
        return;
      }

      // 2) Üye olduğu şirketi company_member'dan bul
      const { data: mem, error: memErr } = await supabase
        .from("company_member")
        .select("company_id")
        .eq("user_id", ures.user.id)
        .maybeSingle();

      if (mem?.company_id && !memErr) {
        const { data: cmp } = await supabase
          .from("company")
          .select("id,name,initial_budget,currency,patron,plan")
          .eq("id", mem.company_id)
          .maybeSingle();
        if (cmp) {
          setCompany(cmp);
          setCurrency(cmp.currency || "TRY");
        }
      }
    })();
  }, []);

  // ------------------------------------------------------------
  // Şirket oluştur
  // ------------------------------------------------------------
  const createCompany = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!cName.trim()) return setToast("⚠️ Şirket adı zorunlu.");

    setCreating(true);
    setToast("");

    // 1) RPC deneyelim (Türkçe plan enum’u ile)
    const rpcRes = await supabase.rpc("create_company_with_owner", {
      p_user_id: user.id,
      p_name: cName.trim(),
      p_plan: cPlan, // 🔹 "Deneme Sürümü" | "Başlangıç" | "Profesyonel" | "Kurumsal"
    });

    if (!rpcRes.error && rpcRes.data) {
      // RPC şirket id döndürür
      const newId = rpcRes.data;
      const { data: cmp } = await supabase
        .from("company")
        .select("id,name,initial_budget,currency,patron,plan")
        .eq("id", newId)
        .single();
      setCompany(cmp);
      setToast("✅ Şirket oluşturuldu.");
      setCreating(false);
      return;
    }

    // 2) RPC başarısızsa → fallback (RLS yetkileri doğru ise çalışır)
    const { data: created, error: cErr } = await supabase
      .from("company")
      .insert([
        {
          name: cName.trim(),
          patron: user.id,
          plan: cPlan, // 🔹 veritabanındaki enum ile birebir
          currency: "TRY",
          initial_budget: 0,
        },
      ])
      .select("id,name,initial_budget,currency,patron,plan")
      .single();

    if (cErr) {
      setToast("❌ Şirket oluşturulamadı: " + cErr.message);
      setCreating(false);
      return;
    }

    // 3) Sahip üyeliğini ekle (idempotent kontrol opsiyonel)
    await supabase
      .from("company_member")
      .insert([{ company_id: created.id, user_id: user.id, role: "patron" }])
      .select()
      .maybeSingle();

    setCompany(created);
    setToast("✅ Şirket oluşturuldu.");
    setCreating(false);
  };

  // ------------------------------------------------------------
  // Hazineye para ekle
  // ------------------------------------------------------------
  const addTreasury = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!company?.id) return setToast("⚠️ Önce şirket oluşturmalısınız.");
    const val = Number(amount);
    if (!isFinite(val) || val <= 0) return setToast("⚠️ Tutar pozitif olmalı.");

    setSaving(true);
    setToast("");

    // 1) RPC varsa deneyelim (sende olmayabilir; hata olursa fallback’e düşer)
    const rpcRes = await supabase.rpc("add_treasury_entry", {
      p_user_id: user.id,
      p_amount: val,
      p_currency: currency,
    });

    if (rpcRes.error) {
      // 2) Fallback: doğrudan güncelle
      const { data, error } = await supabase
        .from("company")
        .update({
          initial_budget: (company.initial_budget || 0) + val,
          currency,
        })
        .eq("id", company.id)
        .select("id,name,initial_budget,currency,patron,plan")
        .single();

      if (error) {
        setToast("❌ Hazine güncellenemedi: " + error.message);
        setSaving(false);
        return;
      }

      setCompany(data);
      setToast("✅ Hazine güncellendi.");
      setAmount("");
      setSaving(false);
      return;
    }

    // RPC başarılıysa şirketi tazele
    const { data: fresh } = await supabase
      .from("company")
      .select("id,name,initial_budget,currency,patron,plan")
      .eq("id", company.id)
      .single();

    if (fresh) setCompany(fresh);
    setToast("✅ Hazine güncellendi.");
    setAmount("");
    setSaving(false);
  };

  return (
    <DashboardShell active="treasury">
      <div className="grid grid-cols-12 gap-4">
        {/* SOL: Hazine */}
        <section className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
            <header className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Hazine</h2>
            </header>

            {company ? (
              <>
                <div className="mb-4 text-sm text-slate-600 space-y-1">
                  <div>
                    <span className="font-medium">Şirket:</span> {company.name}
                  </div>
                  <div>
                    <span className="font-medium">Paket:</span> {company.plan || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Mevcut Bütçe:</span>{" "}
                    {(company.initial_budget || 0).toLocaleString("tr-TR")}{" "}
                    {company.currency || "—"}
                  </div>
                </div>

                <form onSubmit={addTreasury} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Tutar"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`rounded-xl px-4 py-2 text-white ${
                      saving ? "bg-gray-400" : "bg-slate-900 hover:opacity-90"
                    }`}
                  >
                    {saving ? "Kaydediliyor..." : "Hazineye Ekle"}
                  </button>
                </form>
              </>
            ) : (
              <p className="text-slate-600">
                Henüz bir şirketiniz yok. Sağdaki formdan şirket oluşturduktan sonra hazineyi kullanabilirsiniz.
              </p>
            )}
          </div>
        </section>

        {/* SAĞ: Şirket Oluşturma */}
        <aside className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
            <header className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Şirket</h2>
            </header>

            {company ? (
              <div className="text-sm text-slate-700 space-y-2">
                <div>
                  <span className="font-medium">Ad:</span> {company.name}
                </div>
                <div>
                  <span className="font-medium">Paket:</span> {company.plan || "—"}
                </div>
                <div>
                  <span className="font-medium">Para Birimi:</span> {company.currency || "—"}
                </div>
                <div>
                  <span className="font-medium">Başlangıç Bütçesi:</span>{" "}
                  {(company.initial_budget || 0).toLocaleString("tr-TR")}{" "}
                  {company.currency || "—"}
                </div>
                <p className="mt-2 text-slate-500">
                  Yeni bir şirket kurmak için önce mevcut şirketten ayrılma / rol değiştirme akışının tasarlanması gerekir.
                </p>
              </div>
            ) : (
              <form onSubmit={createCompany} className="space-y-3">
                <input
                  type="text"
                  placeholder="Şirket Adı"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />

                {/* 🔹 Plan enumları tamamen Türkçe */}
                <select
                  value={cPlan}
                  onChange={(e) => setCPlan(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {TURKISH_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={creating}
                  className={`w-full rounded-xl px-4 py-2 text-white ${
                    creating ? "bg-gray-400" : "bg-slate-900 hover:opacity-90"
                  }`}
                >
                  {creating ? "Oluşturuluyor..." : "Şirket Oluştur"}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>

      {toast && <div className="mt-4 text-sm text-slate-700">{toast}</div>}
    </DashboardShell>
  );
}
