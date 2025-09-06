// app/auth/callback/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import processInviteMembership from "@/lib/membership"; // company_id → company_member (RPC + temizleme)

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => sbBrowser(), []);
  const [msg, setMsg] = useState("Doğrulama tamamlanıyor…");
  const ranRef = useRef(false); // StrictMode: tek çalıştırma

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let canceled = false;

    (async () => {
      try {
        // 1) Magic link / OAuth code → session
        const url = typeof window !== "undefined" ? window.location.href : "";
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(url);
        if (exchErr) {
          // Oturum zaten açıksa veya PKCE hatası alındıysa akışa devam
          const benign = /pkce|code verifier|already|invalid grant/i.test(exchErr.message || "");
          if (!benign) {
            if (!canceled) setMsg("Doğrulama hatası: " + exchErr.message);
            return;
          }
        }

        // 2) User + metadata
        const { data: { user }, error: uErr } = await supabase.auth.getUser();
        if (uErr || !user) {
          if (!canceled) setMsg("Kullanıcı okunamadı.");
          return;
        }
        const meta = user.user_metadata || {};

        // 3) KURUCU: Şirket oluştur + patron olarak ekle (idempotent)
        if (meta.companyName) {
          const { error: cErr } = await supabase.rpc("create_company_and_add_patron", {
            p_company_name: String(meta.companyName).trim(),
            p_plan: meta.plan ?? null,
          });
          if (cErr) console.error("[create_company_and_add_patron]", cErr);

          // Tek seferlik metadata temizliği
          await supabase.auth.updateUser({ data: { companyName: null, plan: null } });
        }

        // 4) KATILIMCI: metadata.company_id varsa şirkete ekle (idempotent, RPC + temizleme)
        try {
          await processInviteMembership(supabase);
        } catch (mErr) {
          console.error("[processInviteMembership]", mErr);
          // hata olsa da yönlendireceğiz
        }

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
