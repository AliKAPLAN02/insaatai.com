// app/auth/callback/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  // Kullanıcı için şirket/üyelik bootstrap (idempotent)
  const bootstrapDbFor = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = meta.companyName || "";
    const inviteCode  = meta.inviteCode  || "";
    const plan        = meta.plan        || "free";

    try {
      // 1) Şirket kur (owner)
      if (companyName) {
        // Aynı owner + aynı isimli şirket var mı?
        const { data: existingCompany, error: exErr } = await supabase
          .from("company")
          .select("id")
          .eq("owner", user.id)
          .eq("name", companyName)
          .maybeSingle();
        if (exErr) throw exErr;

        let companyId = existingCompany?.id;

        // Yoksa oluştur
        if (!companyId) {
          const { data: created, error: cErr } = await supabase
            .from("company")
            .insert([{ name: companyName, owner: user.id, plan }])
            .select("id")
            .single();
          if (cErr) throw cErr;
          companyId = created.id;
        }

        // Owner üyeliği var mı?
        const { data: existingOwner, error: memErr } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (memErr) throw memErr;

        if (!existingOwner) {
          const { error: insErr } = await supabase
            .from("company_member")
            .insert([{ company_id: companyId, user_id: user.id, role: "owner" }]);
          if (insErr) throw insErr;
        }
      }

      // 2) Davet koduyla katılım (worker)
      if (inviteCode && !companyName) {
        const { data: targetCompany, error: tErr } = await supabase
          .from("company")
          .select("id")
          .eq("id", inviteCode)
          .maybeSingle();
        if (tErr) throw tErr;

        if (targetCompany?.id) {
          const { data: alreadyMember, error: eErr } = await supabase
            .from("company_member")
            .select("user_id")
            .eq("company_id", inviteCode)
            .eq("user_id", user.id)
            .maybeSingle();
          if (eErr) throw eErr;

          if (!alreadyMember) {
            const { error: joinErr } = await supabase
              .from("company_member")
              .insert([{ company_id: inviteCode, user_id: user.id, role: "worker" }]);
            if (joinErr) throw joinErr;
          }
        }
      }

      // 3) Metadata'yı temizle (bir sonraki girişte tekrar tetiklenmesin)
      if (companyName || inviteCode) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null },
        });
      }
    } catch (err) {
      console.error("bootstrapDbFor hata:", err);
      // DB politikaları/izinleri yüzünden hata olabilir; kullanıcıyı yine de dashboard'a alalım.
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // Hata parametresi
        const errDesc = url.searchParams.get("error_description");
        if (errDesc) {
          setMsg("❌ " + errDesc);
          return;
        }

        // Yeni PKCE akışı (?code=...)
        const code = url.searchParams.get("code");
        const qType = url.searchParams.get("type"); // signup, recovery, invite, vb.

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.error("exchangeCodeForSession hatası:", error.message);
            setMsg("❌ Oturum açılamadı.");
            return;
          }

          // Session kuruldu → kullanıcıyı al
          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          // recovery ise şifre reset sayfasına, değilse dashboard'a
          router.replace(qType === "recovery" ? "/reset-password" : "/dashboard");
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

          // Session kuruldu → kullanıcıyı al
          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        // Hiçbir akış denk gelmediyse
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
