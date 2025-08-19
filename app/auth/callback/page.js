"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // Supabase PKCE: ?code=...
        const code = url.searchParams.get("code");
        const errDesc = url.searchParams.get("error_description");
        const qType = url.searchParams.get("type"); // signup, recovery, invite...

        if (errDesc) {
          setMsg("❌ " + errDesc);
          return;
        }

        if (code) {
          // URL’i ver; Supabase kendisi code’u parse eder
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setMsg("❌ Oturum açılamadı.");
            return;
          }
          router.replace(qType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // Eski akış: #access_token=...
        if (url.hash.includes("access_token")) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const hType = params.get("type");

          if (!access_token || !refresh_token) {
            setMsg("❌ Token bulunamadı.");
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setMsg("❌ Oturum başlatılamadı.");
            return;
          }

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        setMsg("❌ Geçersiz dönüş URL'si.");
      } catch (e) {
        console.error(e);
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
