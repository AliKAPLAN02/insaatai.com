"use client";
import DashboardShell from "./DashboardShell";

export default function DashboardHome() {
  return (
    <DashboardShell active="overview">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
        <h1 className="text-2xl font-semibold mb-2">📊 Dashboard</h1>
        <p>İskelet hazır. İçerikleri sonra ekleyeceğiz.</p>
      </div>
    </DashboardShell>
  );
}
