// app/giris/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import processInviteMembership from "@/lib/membership"; // metadata.company_id → company_member

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

    // Login başarılı → metadata.company_id varsa şirkete ekle (idempotent)
    try {
      await processInviteMembership(supabase);
    } catch (err) {
      console.error("[processInviteMembership]", err);
      setMessage("⚠️ Giriş yapıldı fakat üyelik kurulumu hata verdi: " + (err?.message || err));
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
