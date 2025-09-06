// app/giris/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import processInviteMembership from "@/lib/membership"; // company_id → company_member (RPC + temizleme)

export default function LoginPage() {
  const router = useRouter();
  // Supabase client'ı memoize et
  const supabase = useMemo(() => sbBrowser(), []);

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

    try {
      // 1) Giriş
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("email") && msg.includes("not") && msg.includes("confirmed")) {
          setMessage("⚠️ E-posta adresin doğrulanmamış. Lütfen e-postanı doğrula.");
        } else {
          setMessage("❌ Giriş hatası: " + error.message);
        }
        setLoading(false);
        return;
      }

      // 2) Kullanıcı + metadata
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr || !user) {
        setMessage("❌ Oturum bilgisi alınamadı.");
        setLoading(false);
        return;
      }
      const meta = user.user_metadata || {};

      // 3) KURUCU EMNİYET KEMERİ: companyName varsa şirket oluştur + patron ekle (idempotent)
      if (meta.companyName) {
        const { error: createErr } = await supabase.rpc("create_company_and_add_patron", {
          p_company_name: String(meta.companyName).trim(),
          p_plan: meta.plan ?? null,
        });
        if (createErr) {
          console.error("[create_company_and_add_patron]", createErr);
          // Kullanıcıyı bloklamıyoruz; dashboard içinde tekrar deneme/uyarı gösterebilirsin
          setMessage("⚠️ Şirket oluşturma sırasında bir uyarı oluştu.");
        }
        // Tek seferlik temizle
        await supabase.auth.updateUser({ data: { companyName: null, plan: null } });
      }

      // 4) KATILIMCI: metadata.company_id varsa şirkete ekle (idempotent, RPC içerir)
      try {
        await processInviteMembership(supabase);
      } catch (mErr) {
        console.error("[processInviteMembership]", mErr);
        // Burada da kullanıcıyı bloklamıyoruz
        setMessage((prev) =>
          prev
            ? prev + " Üyelik kurulumu tamamlanamadı."
            : "⚠️ Üyelik kurulumu tamamlanamadı."
        );
      }

      // 5) Dashboard'a geç
      router.push("/dashboard");
    } catch (err) {
      console.error("[login]", err);
      setMessage("❌ Beklenmedik hata: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
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
