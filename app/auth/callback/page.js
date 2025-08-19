"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Giriş yapılıyor...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hash = window.location.hash;
        if (!hash.includes("access_token")) {
          setMessage("❌ Geçersiz bağlantı.");
          return;
        }

        const params = new URLSearchParams(hash.replace("#", "?"));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const type = params.get("type"); // signup, recovery, invite vs.

        if (!access_token || !refresh_token) {
          setMessage("❌ Token bulunamadı.");
          return;
        }

        // Session oluştur
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("Session hatası:", error.message);
          setMessage("❌ Oturum başlatılamadı.");
          return;
        }

        // Senaryolara göre yönlendirme
        if (type === "signup") {
          setMessage("✅ Hesap doğrulandı, yönlendiriliyorsunuz...");
          router.push("/dashboard");
        } else if (type === "invite") {
          setMessage("✅ Davet kabul edildi, yönlendiriliyorsunuz...");
          router.push("/dashboard");
        } else if (type === "recovery") {
          setMessage("🔑 Şifre yenileme için yönlendiriliyorsunuz...");
          router.push("/reset-password");
        } else {
          setMessage("✅ Başarılı giriş, yönlendiriliyorsunuz...");
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Callback hatası:", err);
        setMessage("❌ Beklenmedik hata oluştu.");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-lg">{message}</p>
    </div>
  );
}
