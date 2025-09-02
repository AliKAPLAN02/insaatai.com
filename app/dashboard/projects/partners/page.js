// app/dashboard/projects/partners.js
"use client";

import ProjectsShell from "../ProjectsShell";


export default function PartnersPage() {
  return (
    <ProjectsShell>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">👥 Ortaklar</h1>
        
        <section className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Ortaklar Listesi</h2>
          <p className="text-gray-600">Burada proje ortakları ve sahiplik oranları görünecek.</p>
        </section>
      </div>
    </ProjectsShell>
  );
}
