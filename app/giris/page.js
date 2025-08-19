"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

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

        // Eğer companyName varsa → yeni şirket kur
        if (companyName) {
          const { data: newCompany, error: cErr } = await supabase
            .from("company")
            .insert([{ name: companyName, owner: user.id, plan: plan || "free" }])
            .select()
            .single();

          if (cErr) {
            console.error("❌ Şirket kurulamadı:", cErr.message);
          } else {
            // owner üyeliğini eklemeden önce kontrol et
            const { data: existingOwner } = await supabase
              .from("company_member")
              .select("*")
              .eq("company_id", newCompany.id)
              .eq("user_id", user.id)
              .single();

            if (!existingOwner) {
              await supabase.from("company_member").insert([
                { company_id: newCompany.id, user_id: user.id, role: "owner" },
              ]);
            }

            console.log("✅ Şirket kuruldu:", newCompany);
          }
        }

        // Eğer inviteCode varsa → şirkete katıl
        if (inviteCode) {
          // Önceden üye mi kontrol et
          const { data: existingMember } = await supabase
            .from("company_member")
            .select("*")
            .eq("company_id", inviteCode)
            .eq("user_id", user.id)
            .single();

          if (!existingMember) {
            await supabase.from("company_member").insert([
              { company_id: inviteCode, user_id: user.id, role: "worker" },
            ]);
            console.log("✅ Şirkete başarıyla katıldı");
          } else {
            console.log("ℹ️ Kullanıcı zaten bu şirkete üye");
          }
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
