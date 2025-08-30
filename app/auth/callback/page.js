// app/auth/callback/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Giriş yapılıyor...");

  // Kullanıcının metadata'sına göre DB bootstrap
  const bootstrapDbFor = async (user) => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const companyName = meta.companyName?.trim() || "";
    const inviteCode  = meta.inviteCode?.trim() || "";
    const plan        = meta.plan || "trial";

    try {
      // 🔹 1) Patron ise şirket kur
      if (companyName) {
        // Şirket var mı kontrol et
        let { data: existing, error: exErr } = await supabase
          .from("company")
          .select("id")
          .eq("patron", user.id)
          .eq("name", companyName)
          .maybeSingle();
        if (exErr) throw exErr;

        let companyId = existing?.id;

        // Yoksa yeni şirket oluştur
        if (!companyId) {
          const { data: created, error: cErr } = await supabase
            .from("company")
            .insert([{ name: companyName, patron: user.id, plan }])
            .select("id")
            .single();
          if (cErr) throw cErr;
          companyId = created.id;
        }

        // Patron üyeliği yoksa ekle
        const { data: member, error: memErr } = await supabase
          .from("company_member")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (memErr) throw memErr;

        if (!member) {
          await supabase.from("company_member").insert([
            { company_id: companyId, user_id: user.id, role: "patron" },
          ]);
        }
      }

      // 🔹 2) Çalışan ise davet koduyla şirkete katıl
      if (inviteCode && !companyName) {
        const { data: company, error: tErr } = await supabase
          .from("company")
          .select("id")
          .eq("id", inviteCode)
          .maybeSingle();
        if (tErr) throw tErr;

        if (company?.id) {
          const { data: member, error: memErr } = await supabase
            .from("company_member")
            .select("user_id")
            .eq("company_id", company.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (memErr) throw memErr;

          if (!member) {
            await supabase.from("company_member").insert([
              { company_id: company.id, user_id: user.id, role: "calisan" },
            ]);
          }
        }
      }

      // 🔹 3) Metadata’yı sıfırla
      if (companyName || inviteCode) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      console.error("bootstrapDbFor hata:", err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const type = url.searchParams.get("type");

        if (code) {
          // PKCE akışı
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

        if (url.hash.includes("access_token")) {
          // Hash akışı
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

          const { data: ures } = await supabase.auth.getUser();
          await bootstrapDbFor(ures?.user);

          router.replace(hType === "recovery" ? "/reset-password" : "/dashboard");
          return;
        }

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
