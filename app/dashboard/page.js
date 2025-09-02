"use client";

import { useUserOrg } from "./DashboardShell";

export default function DashboardHome() {
  const { company_name, userName } = useUserOrg(); // DashboardShell'deki global context

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
      <h1 className="text-2xl font-semibold mb-2">📊 Dashboard</h1>
      <p>İskelet hazır. İçerikleri sonra ekleyeceğiz.</p>

      <div className="mt-4 text-slate-700">
        <p><strong>Şirket:</strong> {company_name ?? "Yükleniyor..."}</p>
        <p><strong>Kullanıcı:</strong> {userName ?? "Yükleniyor..."}</p>
      </div>
    </div>
  );
}
