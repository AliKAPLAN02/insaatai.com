"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setMessage("⚠️ Bu e-posta ile zaten bir hesap mevcut. Lütfen giriş yap.");
      } else {
        setMessage("❌ Hata: " + error.message);
      }
    } else {
      setMessage("✅ Kayıt başarılı! Lütfen e-postandaki doğrulama linkine tıkla.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Kayıt Ol</h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="tel"
            placeholder="Telefon (+905... formatında)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
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
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        {message && (
          <div className="mt-4 text-center space-y-3">
            <p className="text-sm text-gray-700">{message}</p>

            <div className="pt-2 border-t text-sm">
              <p className="mb-2 font-medium">Doğrulama sonrası:</p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/company/yeni"
                  className="w-full text-center px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  🏢 Şirket Oluştur (Kurucu ol)
                </Link>
                <Link
                  href="/company/katil"
                  className="w-full text-center px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  🔗 Davet ile Katıl
                </Link>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Not: Şirkete katılma işlemini şirket sahibi davet ederek tamamlar.
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="text-slate-900 underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
