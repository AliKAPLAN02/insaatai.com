"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");
  const ranRef = useRef(false);

  // --- Plan mapping (EN → TR) ---
  const planMap = {
    free: "Deneme Sürümü",
    trial: "Deneme Sürümü",
    starter: "Başlangıç",
    pro: "Profesyonel",
    enterprise: "Kurumsal",
  };

  const bootstrapDbFor = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = (meta.companyName || "").trim();
    const inviteCode  = (meta.inviteCode  || "").trim();
    const rawPlan     = (meta.plan        || "").trim();

    // mapping uygula
    const dbPlan = planMap[rawPlan] || "Deneme Sürümü";

    try {
      // --- [A] Kurucu akışı ---
      if (companyName) {
        const { data: companyId, error: rpcErr } = await supabase.rpc(
          "create_company_with_owner",
          {
            p_user_id: user.id,
            p_name: companyName,
            p_plan: dbPlan,       // 👈 artık TR değer gidiyor
            p_currency: "TRY",
            p_initial_budget: 0,
          }
        );

        if (rpcErr) {
          console.error("[CB] RPC hata:", rpcErr);

          // fallback insert
          const { data: created, error: cErr } = await supabase
            .from("company")
            .insert([
              {
                name: companyName,
                patron: user.id,
                plan: dbPlan,      // 👈 yine TR değer
                currency: "TRY",
                initial_budget: 0,
              },
            ])
            .select("id")
            .single();
          if (cErr) throw cErr;

          const companyId2 = created.id;

          // owner üyeliği kontrol + ekle
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

      // --- [B] Davetli akışı ---
      if (inviteCode && !companyName) {
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

      // --- [C] Metadata temizle ---
      if (companyName || inviteCode || rawPlan) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      console.error("[CB] bootstrapDbFor fatal:", err);
      setMsg("⚠️ Kurulum sırasında sorun oluştu, ancak giriş tamamlandı.");
    }
  };

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
        const type = url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
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

        if (url.hash.includes("access_token")) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token  = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const hType         = params.get("type");

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

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

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
