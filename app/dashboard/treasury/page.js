// app/dashboard/treasury/page.js
"use client";

import { useEffect, useState } from "react";
import { sbBrowser } from "@/lib/supabaseBrowserClient"; // ✅ yeni import
import { Building2, FolderKanban } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "trial",      label: "Deneme Sürümü" },
  { value: "starter",    label: "Başlangıç" },
  { value: "pro",        label: "Profesyonel" },
  { value: "enterprise", label: "Kurumsal" },
];

export default function CompanyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Şirket bilgisi + projeler
  const [companyProfile, setCompanyProfile] = useState(null); // {id, name, plan, role, projects: [...]}
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = sbBrowser();
      try {
        const { data: ures } = await supabase.auth.getUser();
        if (!ures?.user) {
          setLoading(false);
          return;
        }
        setUser(ures.user);

        // Kullanıcı-context view (v_user_context veya v_user_context_json)
        const { data, error } = await supabase
          .from("v_user_context") // ✅ gerekirse v_user_context_json olarak değiştir
          .select("*")
          .eq("user_id", ures.user.id);

        if (error) throw error;

        if (data && data.length > 0) {
          const { company_id, company_name, company_role, plan } = data[0];

          const projects = data
            .filter(r => r.project_id)
            .map(r => ({
              id: r.project_id,
              name: r.project_name,
              role: r.project_role,
            }));

          setCompanyProfile({
            id: company_id,
            name: company_name,
            plan,
            role: company_role,
            projects,
          });
        } else {
          setCompanyProfile(null);
        }
      } catch (err) {
        console.error("[CompanyPage] fetch error:", err);
        setToast("❌ Şirket bilgisi alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 lg:col-span-6 lg:col-start-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
          <header className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Şirket Profili</h2>
          </header>

          {companyProfile ? (
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="font-medium">Ad:</span> {companyProfile.name}
              </div>
              <div>
                <span className="font-medium">Plan:</span>{" "}
                {PLAN_OPTIONS.find(p => p.value === companyProfile.plan)?.label ?? companyProfile.plan}
              </div>
              <div>
                <span className="font-medium">Rolünüz:</span> {companyProfile.role}
              </div>

              <div className="mt-4">
                <h3 className="font-medium flex items-center gap-1">
                  <FolderKanban className="h-4 w-4" />
                  Projeler
                </h3>
                {companyProfile.projects.length > 0 ? (
                  <ul className="mt-2 list-disc list-inside text-slate-600">
                    {companyProfile.projects.map(pr => (
                      <li key={pr.id}>
                        {pr.name} <span className="text-slate-500">({pr.role})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-slate-500">Bu şirkette henüz projeye üye değilsiniz.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500">Henüz bir şirkete üye değilsiniz.</div>
          )}

          {toast && <div className="mt-4 text-sm text-slate-700">{toast}</div>}
        </div>
      </section>
    </div>
  );
}
