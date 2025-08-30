// app/auth/callback/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  /**
   * Kullanıcı doğrulandıktan sonra veritabanını hazırlayan yardımcı.
   * - Şirket kur (patron)
   * - Davetle şirkete katıl (çalışan)
   * - Metadata'yı temizle
   */
  const bootstrapDbFor = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = (meta.companyName || "").trim();
    const inviteCode  = (meta.inviteCode  || "").trim();
    const planRaw     = (meta.plan || "trial").trim(); // billing_plan enum
    const plan        = planRaw || "trial";

    try {
      // ----------- PATRON AKIŞI: Şirket kur -----------
      if (companyName) {
        // Aynı isim + aynı patron için şirket zaten var mı?
        const { data: existing } = await supabase
          .from("company")
          .select("id")
          .eq("patron", user.id)
          .eq("name", companyName)
          .maybeSingle();

        if (!existing) {
          // 1) Önce RPC dene (varsa).
          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "create_company_with_owner",
            {
              p_user_id: user.id,
              p_name: companyName,
              p_plan: plan, // enum: trial/free/pro/enterprise
              // RPC'in imzasında varsa sorun çıkmaz; yoksa Supabase "unexpected named argument"
              // hatası verirse aşağıdaki fallback devreye girecek.
              // p_currency: "TRY",
              // p_initial_budget: 0,
            }
          );

          if (rpcErr) {
            // 2) Fallback: doğrudan insert (kolon adları şema ile birebir!)
            const { data: inserted, error: insErr } = await supabase
              .from("company")
              .insert([{
                name: companyName,
                patron: user.id,     // owner değil, PATRON kolonu
                plan,                // billing_plan enum
                currency: "TRY",     // NOT NULL ise zorunlu
                initial_budget: 0    // NOT NULL ise zorunlu
              }])
              .select("id")
              .single();

            if (insErr) {
              console.error("[CB] company insert error:", insErr);
              setMsg("❌ Şirket oluşturulamadı: " + (insErr.message || "bilinmeyen hata"));
            } else if (inserted?.id) {
              // Owner üyeliğini garantile.
              await supabase
                .from("company_member")
                .insert([{ company_id: inserted.id, user_id: user.id, role: "owner" }])
                .select("company_id")
                .maybeSingle();
            }
          } else if (rpcData) {
            // RPC genelde hem company hem membership'i halleder.
            // Yine de idempotentlik için ekstra iş yapmaya gerek yok.
          }
        }
      }

      // ----------- ÇALIŞAN AKIŞI: Davetle katıl -----------
      if (inviteCode && !companyName) {
        // Zaten üye mi?
        const { data: exists } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", inviteCode)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!exists) {
          const { error: joinErr } = await supabase
            .from("company_member")
            .insert([{ company_id: inviteCode, user_id: user.id, role: "calisan" }]);

          if (joinErr) {
            console.error("[CB] company_member insert error:", joinErr);
            setMsg("❌ Şirkete ekleme başarısız: " + (joinErr.message || "bilinmeyen hata"));
          }
        }
      }

      // ----------- Metadata'yı temizle -----------
      if (companyName || inviteCode) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      console.error("[CB] bootstrap fatal error:", err);
      setMsg("❌ Kurulum hatası: " + (err?.message || "bilinmeyen hata"));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) PKCE akışı (?code=...)
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // recovery vs.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
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

        // 2) Eski hash akışı (#access_token=...)
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
            console.error("[CB] setSession error:", error);
            setMsg("❌ Oturum başlatılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // 3) Hiçbiri değil → geçersiz URL
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
