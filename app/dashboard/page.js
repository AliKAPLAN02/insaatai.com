"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const roleLabels = {
    owner: "👑 Kurucu",
    admin: "🛠️ Yönetici",
    worker: "👷 Çalışan",
  };

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
      }
      if (!data?.user) {
        router.push("/giris");
        return;
      }
      setUser(data.user);

      // Kullanıcının üye olduğu şirketler
      const { data: memberCompanies, error: cmErr } = await supabase
        .from("company_member")
        .select("role, company:company_id ( id, name )")
        .eq("user_id", data.user.id);

      if (cmErr) {
        console.error(cmErr);
        setCompanies([]);
      } else {
        setCompanies(memberCompanies || []);
      }
    };
    run();
  }, [router]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md text-center w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">📊 Dashboard</h1>

        {!user ? (
          <p>Yükleniyor...</p>
        ) : (
          <>
            <p>
              Hoş geldin{" "}
              <span className="font-semibold">{user.email}</span> 🎉
            </p>

            <div className="mt-6 text-left">
              <h2 className="text-lg font-semibold mb-2">Şirketlerin</h2>

              {companies.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Henüz bir şirkete üye değilsin.
                  </p>
                  <button
                    onClick={() => router.push("/onboarding")}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Şirket Oluştur / Katıl
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {companies.map((c, i) => (
                    <li
                      key={i}
                      className="p-4 rounded-xl border bg-white shadow-sm flex justify-between items-center hover:shadow-md transition"
                    >
                      <div>
                        <p className="font-medium">{c.company?.name}</p>
                        <p className="text-xs text-gray-500">
                          ID:{" "}
                          <span className="font-mono">{c.company?.id}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {roleLabels[c.role] || c.role}
                        </span>
                        <button
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-100 transition"
                          onClick={() => copy(c.company?.id)}
                        >
                          {copiedId === c.company?.id
                            ? "✅ Kopyalandı"
                            : "Kopyala"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
