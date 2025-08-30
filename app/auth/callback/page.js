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
  // - inviteCode (company_id) varsa: company_member'a 'calisan' insert
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
      //   SQL tarafındaki fonksiyon:
      //   * company oluşturur (patron = p_user_id)
      //   * patronu company_member'a 'patron' olarak ekler
      //   * company_id (uuid) döner
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
      // [B] Çalışan akışı → company_member insert (davet kodu = company_id)
      //   RLS: cm_insert_self (user_id = auth.uid() AND role='calisan')
      // ------------------------------------------------------------
      if (inviteCode && !companyName) {
        // Zaten üye mi? (409'u önlemek için kontrol)
        const { data: exists, error: chkErr } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", inviteCode)
          .eq("user_id", user.id)
          .maybeSingle();

        if (chkErr) {
          console.error("[CB] member check error:", chkErr);
          setMsg("❌ Üyelik kontrolü: " + (chkErr.message || "bilinmeyen hata"));
          return;
        }

        if (!exists) {
          const { error: joinErr } = await supabase
            .from("company_member")
            .insert([{ company_id: inviteCode, user_id: user.id, role: "calisan" }]);

          if (joinErr) {
            console.error("[CB] company_member insert error:", joinErr);
            setMsg("❌ company_member: " + (joinErr.message || "bilinmeyen hata"));
            return;
          }

          console.log("[CB] joined as calisan into:", inviteCode);
        } else {
          console.log("[CB] already member, skipping insert");
        }
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
const { data: session, error: sessErr } = await supabase.auth.getSession();
console.log("Aktif session:", session, "Hata:", sessErr);
