// app/auth/callback/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sbBrowser } from "@/lib/supabaseBrowserClient";

// Basit UUID v4 kontrolü
const isUUIDv4 = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "");

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = sbBrowser();
  const [msg, setMsg] = useState("Doğrulama tamamlanıyor…");

  useEffect(() => {
    let ignore = false;

    (async () => {
      // 1) Magic-link/OAuth dönüşünü session'a çevir
      const { error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (exchErr) {
        if (!ignore) setMsg("Doğrulama hatası: " + exchErr.message);
        return;
      }

      // 2) Kullanıcı + metadata
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr || !user) {
        if (!ignore) setMsg("Kullanıcı okunamadı.");
        return;
      }

      const meta = user.user_metadata || {};
      const inviteCode = (meta.inviteCode || "").trim();

      // 3) SADECE davet akışı: company_member upsert (idempotent)
      if (inviteCode && isUUIDv4(inviteCode)) {
        try {
          const { error: upErr } = await supabase
            .from("company_member")
            .upsert(
              [{ company_id: inviteCode, user_id: user.id, role: "calisan" }],
              { onConflict: "company_id,user_id" }
            );
          if (upErr) throw upErr;

          // (Opsiyonel) Patron e-postasına outbox
          /* const { data: owner } = await supabase
               .from("company")
               .select("users(email)")
               .eq("id", inviteCode).single();
             if (owner?.users?.email) {
               await supabase.from("outbox").insert([{
                 to_email: owner.users.email,
                 subject: "Yeni Kullanıcı Katıldı",
                 body: `Merhaba,\n${user.email} davet kodunuzla şirkete katıldı.`,
               }]);
             } */

          // Metadata'yı temizle (tek seferlikti)
          await supabase.auth.updateUser({
            data: { inviteCode: null }, // companyName/plan'ı girişte işlemek istiyorsan bırak
          });
        } catch (e) {
          if (!ignore) setMsg("Davet kurulumu hatası: " + (e?.message || e));
        }
      }

      // 4) Dashboard'a geç
      router.replace("/dashboard");
    })();

    return () => { ignore = true; };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">{msg}</p>
    </div>
  );
}
