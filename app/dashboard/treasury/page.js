// app/dashboard/treasury/page.js
"use client";

import { useEffect, useState } from "react";
import DashboardShell from "../DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, Building2 } from "lucide-react";

export default function TreasuryPage() {
  const [user, setUser] = useState(null);

  // Şirket durumu
  const [company, setCompany] = useState(null); // {id, name, initial_budget, currency, patron}
  const [cName, setCName] = useState("");
  const [cPlan, setCPlan] = useState("free");
  const [creating, setCreating] = useState(false);

  // Hazine formu
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures?.user) return;
      setUser(ures.user);

      // 1) Önce patron olduğu şirketi dene
      const { data: owned } = await supabase
        .from("company")
        .select("id,name,initial_budget,currency,patron")
        .eq("patron", ures.user.id)
        .maybeSingle();

      if (owned) {
        setCompany(owned);
        setCurrency(owned.currency || "TRY");
        return;
      }

      // 2) Üyelikten bul
      const { data: mem } = await supabase
        .from("company_member")
        .select("company_id")
        .eq("user_id", ures.user.id)
        .maybeSingle();

      if (mem?.company_id) {
        const { data: cmp } = await supabase
          .from("company")
          .select("id,name,initial_budget,currency,patron")
          .eq("id", mem.company_id)
          .maybeSingle();
        if (cmp) {
          setCompany(cmp);
          setCurrency(cmp.currency || "TRY");
        }
      }
    })();
  }, []);

  // --- Şirket oluştur ---
  const createCompany = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!cName.trim()) return setToast("⚠️ Şirket adı zorunlu.");

    setCreating(true);
    setToast("");

    // Önce RPC dene
    const tryRpc = await supabase.rpc("create_company_with_owner", {
      p_user_id: user.id,
      p_name: cName.trim(),
      p_plan: cPlan,
    });

    if (!tryRpc.error && tryRpc.data) {
      // RPC şirket id döndürür
      const newId = tryRpc.data;
      const { data: cmp } = await supabase
        .from("company")
        .select("id,name,initial_budget,currency,patron")
        .eq("id", newId)
        .single();
      setCompany(cmp);
      setToast("✅ Şirket oluşturuldu.");
      setCreating(false);
      return;
    }

    // RPC yoksa/fail ise fallback (idempotent değilse RLS hatası alabilirsin)
    const { data: created, error: cErr } = await supabase
      .from("company")
      .insert([{ name: cName.trim(), plan: cPlan, patron: user.id }])
      .select("id,name,initial_budget,currency,patron")
      .single();

    if (cErr) {
      setToast("❌ Şirket oluşturulamadı: " + cErr.message);
      setCreating(false);
      return;
    }

    // Owner üyeliği ekle (varsa görmezden gel)
    await supabase
      .from("company_member")
      .insert([{ company_id: created.id, user_id: user.id, role: "owner" }])
      .select()
      .maybeSingle();

    setCompany(created);
    setToast("✅ Şirket oluşturuldu.");
    setCreating(false);
  };

  // --- Hazineye para ekle ---
  const addTreasury = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!company?.id) return setToast("⚠️ Önce şirket oluşturmalısınız.");
    const val = Number(amount);
    if (!isFinite(val) || val <= 0) return setToast("⚠️ Tutar pozitif olmalı.");

    setSaving(true);
    setToast("");

    // Önce RPC
    const rpcRes = await supabase.rpc("add_treasury_entry", {
      p_user_id: user.id,
      p_amount: val,
      p_currency: currency,
    });

    if (rpcRes.error) {
      // Fallback: direkt update
      const { data, error } = await supabase
        .from("company")
        .update({
          initial_budget: (company.initial_budget || 0) + val,
          currency,
        })
        .eq("id", company.id)
        .select("id,name,initial_budget,currency,patron")
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
      .select("id,name,initial_budget,currency,patron")
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
                <div className="mb-4 text-sm text-slate-600">
                  <div>
                    <span className="font-medium">Şirket:</span> {company.name}
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
              <div className="text-sm text-slate-700">
                <div className="mb-2">
                  <span className="font-medium">Ad:</span> {company.name}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Para Birimi:</span> {company.currency || "—"}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Başlangıç Bütçesi:</span>{" "}
                  {(company.initial_budget || 0).toLocaleString("tr-TR")} {company.currency || "—"}
                </div>
                <p className="mt-2 text-slate-500">
                  Yeni bir şirket kurmak için önce mevcut şirketten ayrılma/rol değiştirme akışı tasarlanmalı.
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
                <select
                  value={cPlan}
                  onChange={(e) => setCPlan(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="free">Ücretsiz</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
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

      {toast && (
        <div className="mt-4 text-sm text-slate-700">{toast}</div>
      )}
    </DashboardShell>
  );
}
