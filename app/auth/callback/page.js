// app/auth/callback/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Bu sayfa, Supabase e-posta doğrulama linkinden gelindiğinde:
 * - Session kurar (PKCE ?code=... ya da hash flow #access_token=...)
 * - Kullanıcı metadata’sına göre (companyName / inviteCode / plan) veritabanını bootstrap eder
 * - Sonra kullanıcıyı /dashboard sayfasına taşır (recovery ise /reset-password)
 *
 * EXPECTED METADATA (signup’tan gelir):
 *  Kurucu: { companyName: "Kaplan İnşaat", plan: "trial|starter|pro|enterprise" }
 *  Davetli: { inviteCode: "<company_uuid>" }
 */

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");
  const ranRef = useRef(false); // aynı effect'in iki kez çalışmasını engelle

  // --- Yardımcı: Kullanıcıya göre DB bootstrap ---
  const bootstrapDbFor = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = (meta.companyName || "").trim();
    const inviteCode  = (meta.inviteCode  || "").trim();
    const rawPlan     = (meta.plan        || "").trim();

    // enum koruması: plan_config’te olan kodlar
    const allowedPlans = ["trial", "starter", "pro", "enterprise"];
    const safePlan = allowedPlans.includes(rawPlan) ? rawPlan : "trial";

    try {
      // [A] Kurucu akışı: RPC ile şirket + owner üyeliği oluştur
      if (companyName) {
        // RPC argümanlarını eksiksiz gönder (enum/value sorunlarını azaltır)
        const { data: companyId, error: rpcErr } = await supabase.rpc(
          "create_company_with_owner",
          {
            p_user_id: user.id,           // owner
            p_name: companyName,          // şirket adı
            p_plan: safePlan,             // enum: trial|starter|pro|enterprise
            p_currency: "TRY",            // default para birimi
            p_initial_budget: 0           // default başlangıç bütçesi
          }
        );

        if (rpcErr) {
          // RPC başarısız ise doğrudan insert’e düş (fallback)
          console.error("[CB] RPC create_company_with_owner hata:", rpcErr);

          // 1) company
          const { data: created, error: cErr } = await supabase
            .from("company")
            .insert([
              {
                name: companyName,
                patron: user.id,
                plan: safePlan,
                currency: "TRY",
                initial_budget: 0
              },
            ])
            .select("id")
            .single();
          if (cErr) throw cErr;

          const companyId2 = created.id;

          // 2) owner üyeliği (idempotent kontrol)
          const { data: alreadyOwner } = await supabase
            .from("company_member")
            .select("user_id")
            .eq("company_id", companyId2)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!alreadyOwner) {
            const { error: mErr } = await supabase
              .from("company_member")
              .insert([{ company_id: companyId2, user_id: user.id, role: "patron" }]);
            if (mErr) throw mErr;
          }
        }
      }

      // [B] Davetli akışı: company_member’a ekle
      if (inviteCode && !companyName) {
        // zaten üye mi?
        const { data: exists, error: chkErr } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", inviteCode)
          .eq("user_id", user.id)
          .maybeSingle();
        if (chkErr) throw chkErr;

        if (!exists) {
          const { error: joinErr } = await supabase
            .from("company_member")
            .insert([{ company_id: inviteCode, user_id: user.id, role: "calisan" }]);
          if (joinErr) throw joinErr;
        }
      }

      // [C] Metadata temizle → tekrar tetiklenmesin
      if (companyName || inviteCode || rawPlan) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      // Buradaki bir hata kullanıcıyı tamamen bloklamasın; logla ve devam et
      console.error("[CB] bootstrapDbFor fatal:", err);
      // UI mesajı bilgi amaçlı; yönlendirmeyi yine de yapacağız
      setMsg("⚠️ Kurulum sırasında sorun oluştu, ancak giriş tamamlandı.");
    }
  };

  // --- Callback akışı: PKCE (?code=...) veya hash flow (#access_token=...) ---
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const errDesc = url.searchParams.get("error_description");
        if (errDesc) {
          setMsg("❌ " + errDesc);
          return;
        }

        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type"); // recovery vs

        // PKCE
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.error("[CB] exchangeCodeForSession:", error);
            setMsg("❌ Oturum açılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // Hash flow
        if (url.hash.includes("access_token")) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token  = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const hType         = params.get("type");

          if (!access_token || !refresh_token) {
            setMsg("❌ Token bulunamadı.");
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error("[CB] setSession:", error);
            setMsg("❌ Oturum başlatılamadı: " + (error.message || "bilinmeyen hata"));
            return;
          }

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // Geçersiz
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
