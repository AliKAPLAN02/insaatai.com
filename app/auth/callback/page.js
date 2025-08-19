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

        // Yeni Supabase PKCE akışı (?code=...)
        const code = url.searchParams.get("code");
        const errDesc = url.searchParams.get("error_description");
        const qType = url.searchParams.get("type"); // signup, recovery, invite...

        if (errDesc) {
          setMsg("❌ " + errDesc);
          return;
        }

        if (code) {
          // Supabase'e code verip session alıyoruz
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.error("exchangeCodeForSession hatası:", error.message);
            setMsg("❌ Oturum açılamadı.");
            return;
          }

          // recovery (şifre sıfırlama) özel yönlendirme
          if (qType === "recovery") {
            router.replace("/reset-password");
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        // Eski hash akışı (#access_token=...)
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
            console.error("setSession hatası:", error.message);
            setMsg("❌ Oturum başlatılamadı.");
            return;
          }

          if (hType === "recovery") {
            router.replace("/reset-password");
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        // Hiçbiri değilse
        setMsg("❌ Geçersiz dönüş URL'si.");
      } catch (e) {
        console.error("Callback sayfası hatası:", e);
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
