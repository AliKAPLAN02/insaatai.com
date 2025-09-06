"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sbBrowser } from "@/lib/supabaseBrowserClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = sbBrowser();
  const [msg, setMsg] = useState("Doğrulama tamamlanıyor…");

  useEffect(() => {
    let ignore = false;

    (async () => {
      // 1) Magic link / OAuth → session
      const { error: exchErr } = await supabase.auth.exchangeCodeForSession(
        typeof window !== "undefined" ? window.location.href : ""
      );
      if (exchErr) { setMsg("Doğrulama hatası: " + exchErr.message); return; }

      // 2) Taze user + metadata
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr || !user) { setMsg("Kullanıcı okunamadı."); return; }

      const meta = user.user_metadata || {};
      const companyIdMeta = String(meta.company_id || meta.inviteCode || meta.companyId || "").trim();

      // 3) Sadece davet akışı: company_member upsert (idempotent)
      if (companyIdMeta) {
        const { error: upErr } = await supabase
          .from("company_member")
          .upsert(
            [{ company_id: companyIdMeta, user_id: user.id, role: "calisan" }],
            { onConflict: "company_id,user_id" }
          );
        if (upErr) { setMsg("company_member upsert hatası: " + upErr.message); /* return; */ }

        // metadata temizliği (tek seferlik)
        await supabase.auth.updateUser({ data: { company_id: null, inviteCode: null } });
      }

      if (!ignore) router.replace("/dashboard");
    })();

    return () => { ignore = true; };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">{msg}</p>
    </div>
  );
}
