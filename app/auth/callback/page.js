// app/auth/callback/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import processInviteMembership from "@/lib/membership"; // company_id → company_member (RPC + temizleme)

export default function AuthCallbackPage() {
  const router = useRouter();
  // ⚠️ memoize: tekrar render’da yeni client oluşup effect’i tetiklemesin
  const supabase = useMemo(() => sbBrowser(), []);
  const [msg, setMsg] = useState("Doğrulama tamamlanıyor…");

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        // 1) Magic link / OAuth code → session
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(
          typeof window !== "undefined" ? window.location.href : ""
        );
        if (exchErr) {
          if (!canceled) setMsg("Doğrulama hatası: " + exchErr.message);
          return;
        }

        // 2) company_id metadata varsa → üyelik kur (idempotent, RPC ile)
        try {
          await processInviteMembership(supabase);
        } catch (mErr) {
          console.error("[processInviteMembership]", mErr);
          // Hata olsa da kullanıcıyı dashboard’a alalım; içeride toast gösterebilirsin
        }

        // (Opsiyonel) Kurucu akışı burada işlenmeli:
        // const { data: { user } } = await supabase.auth.getUser();
        // const meta = user?.user_metadata || {};
        // if (meta.companyName) { 
        //   await supabase.rpc("create_company_and_add_patron", {
        //     p_company_name: meta.companyName,
        //     p_plan: meta.plan ?? "Deneme Sürümü",
        //   });
        //   // ardından istersen metadata temizliği yap
        // }

        if (!canceled) router.replace("/dashboard");
      } catch (e) {
        console.error(e);
        if (!canceled) setMsg("Beklenmedik hata: " + (e?.message || String(e)));
      }
    })();

    return () => {
      canceled = true;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">{msg}</p>
    </div>
  );
}
