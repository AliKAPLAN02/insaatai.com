// app/dashboard/projects/page.js
"use client";

import { useEffect, useState } from "react";
import ProjectsShell from "./ProjectsShell";
import { Card, CardContent } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { createBrowserClient } from "@supabase/ssr";

function sbBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

export default function ProjectsInfoPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = sbBrowser();
    const loadProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .limit(20);
      if (!error) setProjects(data || []);
      setLoading(false);
    };
    loadProjects();
  }, []);

  const selectedProject = projects.find((p) => String(p.id) === selectedProjectId);

  return (
    <ProjectsShell>
      <div className="space-y-6">
        {/* Header with dropdown */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-3">
            📊 Proje Bilgileri
          </h1>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Proje Seç:</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={loading ? "Yükleniyor..." : "Bir proje seç"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <span className="text-sm text-muted-foreground">
                Seçilen: {selectedProject.name}
              </span>
            )}
          </div>
        </div>

        {/* Genel Bilgiler */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Genel Bilgiler</h2>
            <p className="text-gray-600">
              Burada proje adı, m², kat sayısı, konum ve başlama tarihi gibi
              temel bilgiler gösterilecek.
            </p>
          </CardContent>
        </Card>

        {/* Harcamalar */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Harcamalar</h2>
            <p className="text-gray-600">
              Burada proje kapsamında yapılan harcamalar listelenecek.
            </p>
          </CardContent>
        </Card>

        {/* Borçlar */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Borçlar</h2>
            <p className="text-gray-600">
              Burada projeye ait mevcut borçlar gösterilecek.
            </p>
          </CardContent>
        </Card>

        {/* İlerleme */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">İlerleme Durumu</h2>
            <p className="text-gray-600">
              Burada proje ilerlemesi grafik veya yüzde ilerleme çubuğu şeklinde
              sunulacak.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProjectsShell>
  );
}
