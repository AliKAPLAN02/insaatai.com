// app/auth/callback/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// ✅ Supabase browser client (tekil instance)
function sbBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const supabase = sbBrowser();
      try {
        const url = new URL(window.location.href);

        // Hata mesajı varsa
        const errDesc = url.searchParams.get("error_description");
        if (errDesc) {
          setMsg("❌ " + errDesc);
          return;
        }

        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type");

        // PKCE akışı
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            console.error("[CB] exchangeCodeForSession:", error);
            setMsg("❌ Oturum açılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }
          router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // Hash flow
        if (url.hash.includes("access_token")) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const hType = params.get("type");

          if (!access_token || !refresh_token) {
            setMsg("❌ Token bulunamadı.");
            return;
          }

          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error("[CB] setSession:", error);
            setMsg("❌ Oturum başlatılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        setMsg("❌ Geçersiz dönüş URL'si.");
      } catch (err) {
        console.error("[CB] outer error:", err);
        setMsg("❌ Beklenmedik hata.");
      }
    })();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-lg">{msg}</p>
    </div>
  );
}
