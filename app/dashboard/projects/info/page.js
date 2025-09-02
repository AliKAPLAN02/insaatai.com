// app/dashboard/projects/info.js
"use client";

import ProjectsShell from "@/components/ProjectsShell";

export default function InfoPage() {
  return (
    <ProjectsShell>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">📊 Proje Bilgileri</h1>
        
        {/* Harcamalar */}
        <section className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Harcamalar</h2>
          <p className="text-gray-600">Burada proje harcamaları listelenecek.</p>
        </section>

        {/* Borçlar */}
        <section className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Borçlar</h2>
          <p className="text-gray-600">Burada proje borçları gösterilecek.</p>
        </section>

        {/* İlerleme */}
        <section className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">İlerleme Durumu</h2>
          <p className="text-gray-600">Burada proje ilerlemesi (grafik, yüzde vs.) olacak.</p>
        </section>
      </div>
    </ProjectsShell>
  );
}
