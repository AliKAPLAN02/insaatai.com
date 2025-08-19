"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // 1) Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("❌ Hata: " + error.message);
      setLoading(false);
      return;
    }

    const user = data?.user;
    if (user) {
      try {
        const meta = user.user_metadata || {};
        const { full_name, phone, companyName, inviteCode, plan } = meta;

        // 2) Şirket kurma (idempotent)
        if (companyName) {
          // Aynı owner + aynı isimli şirket var mı?
          const { data: existingCompany, error: exErr } = await supabase
            .from("company")
            .select("*")
            .eq("owner", user.id)
            .eq("name", companyName)
            .maybeSingle();
          if (exErr) throw exErr;

          let companyId = existingCompany?.id;

          // Yoksa oluştur
          if (!companyId) {
            const { data: created, error: cErr } = await supabase
              .from("company")
              .insert([
                {
                  name: companyName,
                  owner: user.id,
                  plan: plan || "free",
                },
              ])
              .select()
              .single();
            if (cErr) throw cErr;
            companyId = created.id;
          }

          // Owner üyeliği var mı?
          const { data: existingOwner } = await supabase
            .from("company_member")
            .select("*")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!existingOwner) {
            await supabase
              .from("company_member")
              .insert([{ company_id: companyId, user_id: user.id, role: "owner" }]);
          }
        }

        // 3) Davet ile katılım (idempotent)
        if (inviteCode) {
          // Geçerli şirket mi?
          const { data: targetCompany } = await supabase
            .from("company")
            .select("id")
            .eq("id", inviteCode)
            .maybeSingle();

          if (targetCompany?.id) {
            const { data: alreadyMember } = await supabase
              .from("company_member")
              .select("*")
              .eq("company_id", inviteCode)
              .eq("user_id", user.id)
              .maybeSingle();

            if (!alreadyMember) {
              await supabase
                .from("company_member")
                .insert([{ company_id: inviteCode, user_id: user.id, role: "worker" }]);
            }
          }
        }

        // 4) Metadata’yı temizle (bir dahaki girişte tekrar tetiklenmesin)
        if (companyName || inviteCode) {
          await supabase.auth.updateUser({
            data: { companyName: null, inviteCode: null },
          });
        }
      } catch (err) {
        console.error("Login sonrası DB işlemleri hatası:", err);
      }
    }

    setMessage("✅ Giriş başarılı! Yönlendiriliyorsunuz...");
    router.push("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-slate-300"
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-slate-300"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}

        <p className="mt-6 text-center text-sm">
          Hesabınız yok mu?{" "}
          <Link href="/kayit_ol" className="text-blue-600 hover:underline">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
