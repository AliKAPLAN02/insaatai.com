"use client";

import { useEffect, useState } from "react";
import DashboardShell from "../DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { Building2 } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "trial",      label: "Deneme Sürümü" },
  { value: "starter",    label: "Başlangıç" },
  { value: "pro",        label: "Profesyonel" },
  { value: "enterprise", label: "Kurumsal" },
];

export default function CompanyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Company state (yeni şemaya uygun)
  const [company, setCompany] = useState(null); // {id, name, plan, patron, created_at}

  // Create form
  const [cName, setCName] = useState("");
  const [cPlan, setCPlan] = useState("trial");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  // Kullanıcının şirketini çek (önce üyelikten join)
  useEffect(() => {
    (async () => {
      try {
        const { data: ures } = await supabase.auth.getUser();
        if (!ures?.user) {
          setLoading(false);
          return;
        }
        setUser(ures.user);

        // 1) Üyelik tablosu üzerinden şirketi çek (en güvenlisi)
        // company_member.user_id = user.id -> company_member.company_id -> company
        const { data: viaMembership, error: mErr } = await supabase
          .from("company_member")
          .select("company:company_id(id, name, plan, patron, created_at)")
          .eq("user_id", ures.user.id)
          .maybeSingle();

        if (mErr) throw mErr;

        if (viaMembership?.company) {
          setCompany(viaMembership.company);
          setLoading(false);
          return;
        }

        // 2) Yedek: patron olduğu şirket (her ihtimale karşı)
        const { data: owned, error: oErr } = await supabase
          .from("company")
          .select("id, name, plan, patron, created_at")
          .eq("patron", ures.user.id)
          .maybeSingle();

        if (oErr) throw oErr;

        if (owned) setCompany(owned);
      } catch (err) {
        console.error("[CompanyPage] fetch error:", err);
        setToast("❌ Şirket bilgisi alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createCompany = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!cName.trim()) {
      setToast("⚠️ Şirket adı zorunlu.");
      return;
    }

    setCreating(true);
    setToast("");

    // Enum koruması
    const allowed = PLAN_OPTIONS.map(p => p.value);
    const safePlan = allowed.includes(cPlan) ? cPlan : "trial";

    // Önce RPC (patronu company_member'a da ekler)
    const { data: newCompanyId, error: rpcErr } = await supabase.rpc(
      "create_company_with_owner",
      {
        p_user_id: user.id,
        p_name: cName.trim(),
        p_plan: safePlan,
      }
    );

    if (rpcErr) {
      console.error("[CompanyPage] RPC error:", rpcErr);
      setToast("❌ Şirket oluşturulamadı: " + (rpcErr.message || "bilinmeyen hata"));
      setCreating(false);
      return;
    }

    // Oluşan şirketi getir
    const { data: cmp, error: cErr } = await supabase
      .from("company")
      .select("id, name, plan, patron, created_at")
      .eq("id", newCompanyId)
      .single();

    if (cErr) {
      console.error("[CompanyPage] fetch new company error:", cErr);
      setToast("⚠️ Şirket oluşturuldu ama okunamadı.");
    } else {
      setCompany(cmp);
      setToast("✅ Şirket oluşturuldu.");
      setCName("");
      setCPlan("trial");
    }

    setCreating(false);
  };

  if (loading) {
    return (
      <DashboardShell active="treasury">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
          Yükleniyor…
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="treasury">
      <div className="grid grid-cols-12 gap-4">
        {/* SAĞ: Şirket Oluşturma / Bilgi */}
        <section className="col-span-12 lg:col-span-6 lg:col-start-4">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
            <header className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Şirket</h2>
            </header>

            {company ? (
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <span className="font-medium">Ad:</span> {company.name}
                </div>
                <div>
                  <span className="font-medium">Plan:</span>{" "}
                  {PLAN_OPTIONS.find(p => p.value === company.plan)?.label ?? company.plan}
                </div>
                <div>
                  <span className="font-medium">Kuruluş:</span>{" "}
                  {company.created_at ? new Date(company.created_at).toLocaleString("tr-TR") : "—"}
                </div>
                <p className="mt-2 text-slate-500">
                  Proje bazlı hazineye geçildi. Bütçe ve para birimi artık projelerden hesaplanır.
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
                  {PLAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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

            {toast && <div className="mt-4 text-sm text-slate-700">{toast}</div>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
