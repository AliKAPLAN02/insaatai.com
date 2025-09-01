"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// Menü ikonları
import {
  Menu, X, ChevronLeft, ChevronRight,
  ChartLine, Wallet, WalletCards, HandCoins,
  Building2, FolderKanban, Users2, FileBarChart, Settings,
} from "lucide-react";

/* ------------------------- Global Context ------------------------- */
const UserOrgContext = createContext({});
export function useUserOrg() {
  return useContext(UserOrgContext);
}
/* ----------------------------------------------------------------- */

export default function DashboardShell({ children, active = "overview" }) {
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Context state
  const [userName, setUserName] = useState("Yükleniyor...");
  const [companyId, setCompanyId] = useState(undefined);
  const [companyName, setCompanyName] = useState("Yükleniyor...");
  const [companyRole, setCompanyRole] = useState(undefined);
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [projectRole, setProjectRole] = useState(null);

  const mainColClass = collapsed ? "lg:col-span-11" : "lg:col-span-10";

  // v_user_context'ten global context'i çek
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserName(user.user_metadata?.full_name || user.email || "Kullanıcı");

        const { data: rows, error } = await supabase
          .from("v_user_context")
          .select("company_id, company_name, company_role, project_id, project_name, project_role")
          .eq("user_id", user.id)
          .limit(1);

        if (error) throw error;

        const ctx = rows?.[0];
        if (ctx) {
          setCompanyId(ctx.company_id);
          setCompanyName(ctx.company_name ?? "Şirket");
          setCompanyRole(ctx.company_role ?? undefined);
          setProjectId(ctx.project_id ?? null);
          setProjectName(ctx.project_name ?? null);
          setProjectRole(ctx.project_role ?? null);
        } else {
          setCompanyName("Şirket bulunamadı");
          setProjectName(null);
        }
      } catch (e) {
        console.error("v_user_context fetch error:", e);
        setCompanyName("Şirket (erişim hatası)");
      }
    };

    fetchContext();
  }, []);

  // Menü tanımları (Türkçe)
  const Nav = [
    { key: "overview", href: "/dashboard", label: "Özet", icon: <ChartLine className="h-4 w-4" /> },
    { key: "treasury", href: "/dashboard/treasury", label: "Şirket & Hazine", icon: <Wallet className="h-4 w-4" /> },
    { key: "transactions", href: "/dashboard/transactions", label: "İşlemler", icon: <WalletCards className="h-4 w-4" /> },
    { key: "debts", href: "/dashboard/debts", label: "Borçlar", icon: <HandCoins className="h-4 w-4" /> },
    { key: "companies", href: "/dashboard/companies", label: "Firmalar", icon: <Building2 className="h-4 w-4" /> },
    { key: "projects", href: "/dashboard/projects", label: "Projeler", icon: <FolderKanban className="h-4 w-4" /> },
    { key: "team", href: "/dashboard/team", label: "Ekip", icon: <Users2 className="h-4 w-4" /> },
    { key: "reports", href: "/dashboard/ai-reports", label: "Raporlar & Yapay Zeka", icon: <FileBarChart className="h-4 w-4" /> },
    { key: "settings", href: "/dashboard/settings", label: "Ayarlar", icon: <Settings className="h-4 w-4" /> },
  ];

  const contextValue = {
    userName,
    company_id: companyId,
    company_name: companyName,
    company_role: companyRole,
    project_id: projectId,
    project_name: projectName,
    project_role: projectRole,
  };

  return (
    <UserOrgContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50">
        {/* --- TOPBAR ---------------------------------------------------- */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100"
                aria-label="Menüyü aç"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center">IA</div>
              <span className="truncate max-w-[50vw] sm:max-w-[30vw]">
                {companyName}
                {projectName ? ` · ${projectName}` : ""}
              </span>
            </div>
            <div className="text-sm text-slate-600">{userName}</div>
          </div>
        </header>

        {/* --- ANA GRID -------------------------------------------------- */}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className={`hidden lg:block ${collapsed ? "lg:col-span-1" : "lg:col-span-2"}`}>
            <div className="sticky top-20">
              <button
                onClick={() => setCollapsed(!collapsed)}
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

          {/* İçerik */}
          <main className={`col-span-12 ${mainColClass}`}>{children}</main>
        </div>

        {/* --- MOBİL DRAWER ---------------------------------------------- */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl p-4 lg:hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center">IA</div>
                  <span className="truncate">{companyName}</span>
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
                    className={`block rounded-xl px-3 py-2 text-sm ${
                      active === item.key ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* --- MOBİL ALT TABBAR ------------------------------------------ */}
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
            <Link
              key={it.key}
              href={it.href}
              className={`flex flex-col items-center py-2 text-xs ${
                active === it.key ? "text-slate-900" : "text-slate-600"
              }`}
            >
              {it.icon}
              <span className="mt-1">{it.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </UserOrgContext.Provider>
  );
}
