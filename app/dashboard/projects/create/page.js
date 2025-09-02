"use client";

import ProjectsShell from "../ProjectsShell";

export default function CreateProjectPage() {
  return (
    <ProjectsShell>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">➕ Yeni Proje</h1>

        <section className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Proje Oluştur</h2>
          <p className="text-gray-600">Burada yeni proje oluşturma formu olacak.</p>
        </section>
      </div>
    </ProjectsShell>
  );
}
