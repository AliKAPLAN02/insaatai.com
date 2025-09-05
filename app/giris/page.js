// app/giris/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient"; // ✅ doğrudan yeni client

export default function LoginPage() {
  const router = useRouter();
  const supabase = sbBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- Giriş sonrası metadata işlemleri ---
  const processMetadata = async (user) => {
    if (!user) return;

    const meta = user.user_metadata || {};
    const companyName = (meta.companyName || "").trim();
    const inviteCode  = (meta.inviteCode || "").trim();
    const plan        = (meta.plan || "").trim();

    try {
      // --- [A] Şirket kurucu akışı ---
      if (companyName) {
        const { data: company, error: cErr } = await supabase
          .from("company")
          .insert([
            {
              name: companyName,
              patron: user.id,
              plan,
              currency: "TRY",
              initial_budget: 0,
            },
          ])
          .select("id")
          .single();

        if (cErr) throw cErr;
        const companyId = company.id;

        // Patronu company_member tablosuna ekle
        const { error: mErr } = await supabase
          .from("company_member")
          .insert([{ company_id: companyId, user_id: user.id, role: "patron" }]);
        if (mErr) throw mErr;
      }

      // --- [B] Davet koduyla katılım akışı ---
      if (inviteCode && !companyName) {
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
          if (joinErr) throw joinErr;
        }
      }

      // --- [C] Metadata temizle ---
      if (companyName || inviteCode || plan) {
        await supabase.auth.updateUser({
          data: { companyName: null, inviteCode: null, plan: null },
        });
      }
    } catch (err) {
      console.error("[Login] metadata işlenirken hata:", err);
    }
  };

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

    const user = data.user;

    // 📌 Metadata’yı işle
    await processMetadata(user);

    router.push("/dashboard"); // ✅ Direkt yönlendirme
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
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
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

        <p className="mt-2 text-center text-sm">
          Şifrenizi mi unuttunuz?{" "}
          <Link href="/sifremi-unuttum" className="text-blue-600 hover:underline">
            Şifremi Unuttum
          </Link>
        </p>
      </div>
    </div>
  );
}
