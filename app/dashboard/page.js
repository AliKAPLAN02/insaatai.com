"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "./DashboardShell";

export default function DashboardHome() {
  const [companyName, setCompanyName] = useState(null);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Kullanıcı bilgisi
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) return;

      setUserName(user.user_metadata?.full_name || user.email);

      // Kullanıcının bağlı olduğu şirketi bul
      const { data: member, error: memberErr } = await supabase
        .from("company_member")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (memberErr || !member) return;

      // Şirket adını al
      const { data: company, error: compErr } = await supabase
        .from("company")
        .select("name")
        .eq("id", member.company_id)
        .single();

      if (!compErr && company) {
        setCompanyName(company.name);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardShell active="overview">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
        <h1 className="text-2xl font-semibold mb-2">📊 Dashboard</h1>
        <p>İskelet hazır. İçerikleri sonra ekleyeceğiz.</p>

        <div className="mt-4 text-slate-700">
          <p><strong>Şirket:</strong> {companyName || "Yükleniyor..."}</p>
          <p><strong>Kullanıcı:</strong> {userName || "Yükleniyor..."}</p>
        </div>
      </div>
    </DashboardShell>
  );
}
