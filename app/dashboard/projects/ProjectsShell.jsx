"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProjectsShell({ children }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/projects", label: "Bilgiler" },     // ✅ info yerine projects
    { href: "/dashboard/projects/partners", label: "Ortaklar" },
    { href: "/dashboard/projects/create", label: "Yeni Proje" },
  ];

  return (
    <div className="w-full">
      {/* Üst Menü */}
      <div className="flex space-x-6 border-b mb-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
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
      <div className="p-4">{children}</div>
    </div>
  );
}
