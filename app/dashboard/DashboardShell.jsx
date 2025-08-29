"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu, X, ChevronLeft, ChevronRight,
  ChartLine, Wallet, WalletCards, HandCoins,
  Building2, FolderKanban, Users2, FileBarChart, Settings,
} from "lucide-react";

export default function DashboardShell({ children, active = "overview" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [collapsed, setCollapsed] = useState(false);       // desktop collapse
  const mainColClass = collapsed ? "lg:col-span-11" : "lg:col-span-10";

  const Nav = [
    { key: "overview", href: "/dashboard", label: "Özet", icon: <ChartLine className="h-4 w-4" /> },
    { key: "treasury", href: "/dashboard/treasury", label: "Hazine", icon: <Wallet className="h-4 w-4" /> },
    { key: "transactions", href: "/dashboard/transactions", label: "İşlemler", icon: <WalletCards className="h-4 w-4" /> },
    { key: "debts", href: "/dashboard/debts", label: "Borçlar", icon: <HandCoins className="h-4 w-4" /> },
    { key: "companies", href: "/dashboard/companies", label: "Firmalar", icon: <Building2 className="h-4 w-4" /> },
    { key: "projects", href: "/dashboard/projects", label: "Projeler", icon: <FolderKanban className="h-4 w-4" /> },
    { key: "team", href: "/dashboard/team", label: "Ekip", icon: <Users2 className="h-4 w-4" /> },
    { key: "reports", href: "/dashboard/ai-reports", label: "Raporlar & AI", icon: <FileBarChart className="h-4 w-4" /> }, // ✅ düzeltildi
    { key: "settings", href: "/dashboard/settings", label: "Ayarlar", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3 flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100"
            aria-label="Menüyü aç"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center">IA</div>
            <span>İnşaat AI</span>
          </div>
        </div>
      </header>

      {/* İç ızgara */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 grid grid-cols-12 gap-4">
        {/* Desktop sidebar */}
        <aside className={`hidden lg:block ${collapsed ? "lg:col-span-1" : "lg:col-span-2"}`}>
          <div className="sticky top-20">
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              className="mb-2 w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <span className={`${collapsed ? "hidden" : ""}`}>Menü</span>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <nav className="space-y-1">
              {Nav.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.label}
                  className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active === item.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sayfa içeriği */}
        <main className={`col-span-12 ${mainColClass}`}>{children}</main>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl p-4 lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center">IA</div>
                <span>İnşaat AI</span>
              </div>
              <button className="p-2 rounded-xl hover:bg-slate-100" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {Nav.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm ${active === item.key ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Mobile bottom tabbar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {[
          { key: "overview", href: "/dashboard", icon: <ChartLine className="h-5 w-5" />, label: "Özet" },
          { key: "transactions", href: "/dashboard/transactions", icon: <WalletCards className="h-5 w-5" />, label: "İşlemler" },
          { key: "debts", href: "/dashboard/debts", icon: <HandCoins className="h-5 w-5" />, label: "Borçlar" },
          { key: "projects", href: "/dashboard/projects", icon: <FolderKanban className="h-5 w-5" />, label: "Projeler" },
          { key: "settings", href: "/dashboard/settings", icon: <Settings className="h-5 w-5" />, label: "Ayarlar" },
        ].map((it) => (
          <Link key={it.key} href={it.href} className={`flex flex-col items-center py-2 text-xs ${active === it.key ? "text-slate-900" : "text-slate-600"}`}>
            {it.icon}
            <span className="mt-1">{it.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
