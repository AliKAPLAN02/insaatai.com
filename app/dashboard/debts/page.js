"use client";
import DashboardShell from "../DashboardShell";

export default function DebtsPage() {
  return (
    <DashboardShell active="debts">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
        <h1 className="text-2xl font-semibold">💸 Borçlar</h1>
        <p>Bu sayfa şimdilik boş.</p>
      </div>
    </DashboardShell>
  );
}
