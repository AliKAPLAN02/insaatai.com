// app/sifremi-unuttum/page.js
"use client";

import { useState } from "react";
import { sbBrowser } from "@/lib/supabaseBrowserClient"; // ✅ yeni client

export default function ForgotPasswordPage() {
  const supabase = sbBrowser(); // ✅ client burada oluşturuluyor

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage("❌ Hata: " + error.message);
      } else {
        setMessage("📩 Şifre sıfırlama linki e-posta adresinize gönderildi.");
      }
    } catch (err) {
      console.error("[ForgotPassword] hata:", err);
      setMessage("❌ Beklenmedik hata: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Şifremi Unuttum</h1>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-slate-300"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
          >
            {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
