// app/auth/callback/page.js
"use client";
console.log("[CALLBACK FILE ÇALIŞIYOR]");

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  // ------------------------------------------------------------
  // Kullanıcının metadata'sına göre veritabanını bootstrap et
  // - companyName varsa: create_company_with_owner RPC (patron akışı)
  // - inviteCode (company_id) varsa: join_company_as_worker RPC (çalışan akışı)
  // - işlem sonrası metadata sıfırlanır (tekrar tetiklenmesin)
  // ------------------------------------------------------------
  const bootstrapDbFor = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = meta.companyName?.trim() || "";
    const inviteCode  = meta.inviteCode?.trim() || "";
    const plan        = (meta.plan || "trial").trim();

    console.log("[CB] meta:", { companyName, inviteCode, plan, uid: user.id });

    try {
      // ------------------------------------------------------------
      // [A] Patron akışı → create_company_with_owner RPC
      // ------------------------------------------------------------
      if (companyName) {
        const { data: companyId, error: rpcErr } = await supabase.rpc("create_company_with_owner", {
          p_user_id: user.id,
          p_name: companyName,
          p_plan: plan,
        });

        if (rpcErr) {
          console.error("[CB] create_company_with_owner error:", rpcErr);
          setMsg("❌ create_company_with_owner: " + (rpcErr.message || "bilinmeyen hata"));
          return;
        }

        console.log("[CB] company created:", companyId);
      }

      // ------------------------------------------------------------
      // [B] Çalışan akışı → join_company_as_worker RPC
      // ------------------------------------------------------------
      if (inviteCode && !companyName) {
        const { error: joinErr } = await supabase.rpc("join_company_as_worker", {
          p_user_id: user.id,
          p_company_id: inviteCode,
        });

        if (joinErr) {
          console.error("[CB] join_company_as_worker error:", joinErr);
          setMsg("❌ join_company_as_worker: " + (joinErr.message || "bilinmeyen hata"));
          return;
        }

        console.log("[CB] joined as calisan into:", inviteCode);
      }

      // ------------------------------------------------------------
      // [C] Metadata’yı temizle → bir sonraki girişte yeniden tetiklenmesin
      // ------------------------------------------------------------
      if (companyName || inviteCode) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
        console.log("[CB] metadata cleared");
      }
    } catch (err) {
      console.error("[CB] bootstrap fatal error:", err);
      setMsg("❌ Bootstrap hatası: " + (err?.message || "bilinmeyen hata"));
      return;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // signup, recovery vb.

        // ------------------------------------------------------------
        // PKCE akışı (?code=...)
        // ------------------------------------------------------------
        if (code) {
          console.log("[CB] PKCE flow detected");
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.error("[CB] exchangeCodeForSession error:", error);
            setMsg("❌ Oturum açılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // ------------------------------------------------------------
        // Eski hash akışı (#access_token=...)
        // ------------------------------------------------------------
        if (url.hash.includes("access_token")) {
          console.log("[CB] Hash flow detected");
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
            console.error("[CB] setSession error:", error);
            setMsg("❌ Oturum başlatılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // ------------------------------------------------------------
        // Ne PKCE ne de hash → geçersiz dönüş
        // ------------------------------------------------------------
        console.warn("[CB] Invalid callback URL");
        setMsg("❌ Geçersiz dönüş URL'si.");
      } catch (err) {
        console.error("[CB] callback outer error:", err);
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
