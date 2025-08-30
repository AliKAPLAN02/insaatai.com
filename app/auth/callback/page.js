// app/auth/callback/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  // ------------------------------------------------------------
  // Kullanıcının metadata'sına göre veritabanını bootstrap et
  // - companyName varsa: create_company RPC çağrısı (patron)
  // - inviteCode (company_id) varsa: company_member'a 'calisan' insert
  // - işlem sonrası metadata sıfırlanır (tekrar tetiklenmesin)
  // ------------------------------------------------------------
  const bootstrapDbFor = async (user) => {
    if (!user) return;

    // -- Metadata okuma
    const meta = user.user_metadata || {};
    const companyName = meta.companyName?.trim() || "";
    const inviteCode  = meta.inviteCode?.trim() || "";
    const plan        = meta.plan || "trial";

    try {
      // ------------------------------------------------------------
      // [A] Patron akışı → create_company RPC (tek fonksiyon)
      //  - SQL tarafında create_company(p_name,p_plan) fonksiyonu:
      //    * company oluşturur (patron = auth.uid())
      //    * patronu company_member'a 'patron' olarak ekler
      //    * company_id (uuid) döner
      // ------------------------------------------------------------
      if (companyName) {
        const { data: companyId, error: rpcErr } = await supabase.rpc("create_company", {
          p_name: companyName,
          p_plan: plan,
        });
        if (rpcErr) throw rpcErr;
        // (İsteğe bağlı) companyId ile yönlendirme/işlem yapılabilir
        // console.log("Şirket kuruldu:", companyId);
      }

      // ------------------------------------------------------------
      // [B] Çalışan akışı → company_member insert (davet kodu = company_id)
      //  - RLS policy: cm_insert_self (user_id = auth.uid() AND role='calisan')
      //  - Tabloda UNIQUE(company_id,user_id) varsa tekrar eklemeyi engeller
      // ------------------------------------------------------------
      if (inviteCode && !companyName) {
        // (Opsiyonel) Zaten üye mi? Önden kontrol edelim ki 409 hatası olmasın
        const { data: exists, error: checkErr } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", inviteCode)
          .eq("user_id", user.id)
          .maybeSingle();
        if (checkErr) throw checkErr;

        if (!exists) {
          const { error: joinErr } = await supabase
            .from("company_member")
            .insert([{ company_id: inviteCode, user_id: user.id, role: "calisan" }]);
          if (joinErr) throw joinErr;
        }
      }

      // ------------------------------------------------------------
      // [C] Metadata’yı temizle → bir sonraki girişte yeniden tetiklenmesin
      // ------------------------------------------------------------
      if (companyName || inviteCode) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      console.error("[callback bootstrap] hata:", err);
      // Not: Burada hataya rağmen kullanıcıyı yine de dashboard’a alabiliriz
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // ------------------------------------------------------------
        // Supabase dönüş URL'sini incele: PKCE (code=...) veya hash akışı
        // ------------------------------------------------------------
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // signup, recovery vb.

        // ------------------------------------------------------------
        // PKCE akışı (?code=...)
        // ------------------------------------------------------------
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;

          // -- Oturum kuruldu: kullanıcıyı al ve bootstrap et
          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          // -- recovery ise reset sayfasına, değilse dashboard'a yönlendir
          router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // ------------------------------------------------------------
        // Eski hash akışı (#access_token=...)
        // ------------------------------------------------------------
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
          if (error) throw error;

          // -- Oturum kuruldu: kullanıcıyı al ve bootstrap et
          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // ------------------------------------------------------------
        // Ne PKCE ne de hash → geçersiz dönüş
        // ------------------------------------------------------------
        setMsg("❌ Geçersiz dönüş URL'si.");
      } catch (err) {
        console.error("Callback hatası:", err);
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
