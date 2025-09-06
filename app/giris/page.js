// app/giris/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import processInviteMembership from "@/lib/membership"; // company_id → company_member (RPC + temizleme)

export default function LoginPage() {
  const router = useRouter();
  const supabase = sbBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // (Opsiyonel) Kayıt adımında saklanan e-postayı otomatik doldur
  useEffect(() => {
    try {
      const saved = localStorage.getItem("signup_pending_email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    const normalizedEmail = (email || "").trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setMessage("❌ Giriş hatası: " + error.message);
      setLoading(false);
      return;
    }

    try {
      // 1) KURUCU EMNİYET KEMERİ: metadata.companyName varsa şirket oluştur + patron ekle (idempotent)
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      if (meta.companyName) {
        const { error: createErr } = await supabase.rpc("create_company_and_add_patron", {
          p_company_name: String(meta.companyName).trim(),
          p_plan: meta.plan ?? null,
        });
        if (createErr) {
          console.error("[create_company_and_add_patron]", createErr);
          setMessage("⚠️ Şirket oluşturma sırasında bir uyarı oluştu: " + createErr.message);
        }
        // Tek seferlik temizle
        await supabase.auth.updateUser({ data: { companyName: null, plan: null } });
      }

      // 2) KATILIMCI: metadata.company_id varsa şirkete ekle (idempotent, RPC içerir)
      await processInviteMembership(supabase);
    } catch (err) {
      console.error("[login after-signin]", err);
      setMessage("⚠️ Giriş yapıldı fakat üyelik/kurucu kurulumu hata verdi: " + (err?.message || err));
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
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
            autoComplete="email"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            autoComplete="current-password"
            required
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-2 rounded-lg ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:opacity-90"
            }`}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}

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
