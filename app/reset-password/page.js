// app/reset-password/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sbBrowser } from "@/lib/supabaseBrowserClient"; // ✅ yeni client

export default function ResetPasswordPage() {
  const supabase = sbBrowser();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage("❌ Hata: " + error.message);
      } else {
        setMessage("✅ Şifre başarıyla güncellendi.");
        setTimeout(() => router.push("/giris"), 2000);
      }
    } catch (err) {
      console.error("[ResetPassword] hata:", err);
      setMessage("❌ Beklenmedik hata: " + (err.message || String(err)));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Yeni Şifre Belirle</h1>

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="password"
            placeholder="Yeni Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-slate-300"
            required
          />

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
          >
            Şifreyi Güncelle
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
