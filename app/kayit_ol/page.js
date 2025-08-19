"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // === KAYIT ===
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Şifre kontrolü
    if (password !== confirmPassword) {
      setMessage("⚠️ Şifreler eşleşmiyor!");
      setLoading(false);
      return;
    }

    // Kullanıcı kaydı
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setMessage("⚠️ Bu e-posta ile zaten bir hesap mevcut. Lütfen giriş yap.");
      } else {
        setMessage("❌ Hata: " + error.message);
      }
      setLoading(false);
      return;
    }

    // Şirket oluştur
    if (companyName) {
      const user = data?.user;
      if (user) {
        const { error: companyError } = await supabase
          .from("company")
          .insert([{ name: companyName, owner: user.id }]);

        if (companyError) {
          setMessage("⚠️ Kullanıcı oluşturuldu fakat şirket eklenemedi: " + companyError.message);
        } else {
          setMessage("✅ Kayıt başarılı! Mail doğrulama linkini kontrol et & şirket oluşturuldu.");
        }
      }
    } else {
      setMessage("✅ Kayıt başarılı! Lütfen mail doğrulama linkini kontrol et.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold mb-4 text-center">Kayıt Ol</h1>

        {/* FORM */}
        <form onSubmit={handleSignup} className="space-y-4">
          <input type="text" placeholder="Ad Soyad"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          
          <input type="tel" placeholder="Telefon (+905...)"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          
          <input type="email" placeholder="E-posta"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          
          <input type="password" placeholder="Şifre"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />

          <input type="password" placeholder="Şifre (Tekrar)"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />

          <input type="text" placeholder="Şirket Adı"
            value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />

          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90">
            {loading ? "Kaydediliyor..." : "Kayıt Ol & Şirket Oluştur"}
          </button>
        </form>

        {/* MESAJ */}
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
