"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProjectsShell({ children }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/projects", label: "Bilgiler" },
    { href: "/dashboard/projects/partners", label: "Ortaklar ve Bütçe" },
    { href: "/dashboard/projects/team", label: "Çalışan & Ortak Ekleme" },
    { href: "/dashboard/projects/create", label: "Yeni Proje" },
  ];

  return (
    <div className="w-full">
      {/* Üst Menü */}
      <div className="flex space-x-6 border-b mb-6">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href); // 🔑 daha esnek kontrol
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium ${
                isActive
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* İçerik */}
      <div>{children}</div>
    </div>
  );
}
