"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [plan, setPlan] = useState("free");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // === Validation ===
    if (password !== password2) {
      setMessage("⚠️ Şifreler uyuşmuyor!");
      setLoading(false);
      return;
    }
    if (companyName && inviteCode) {
      setMessage("⚠️ Aynı anda hem şirket kurucu hem davet kodu kullanılamaz!");
      setLoading(false);
      return;
    }
    if (!companyName && !inviteCode) {
      setMessage("⚠️ Lütfen ya şirket adı girin ya da davet kodu girin.");
      setLoading(false);
      return;
    }
    if (companyName && !plan) {
      setMessage("⚠️ Şirket kuruyorsanız bir paket seçmelisiniz.");
      setLoading(false);
      return;
    }

    // === Kullanıcı oluştur ===
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, companyName, inviteCode, plan },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, // doğrulama sonrası yönlendirme
      },
    });

    if (error) {
      setMessage("❌ Hata: " + error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "✅ Kayıt başarılı! Lütfen e-postandaki doğrulama linkine tıklayın. Doğruladıktan sonra otomatik dashboard’a yönlendirileceksiniz."
    );
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Kayıt Ol</h1>

        <form onSubmit={handleSignup} className="space-y-3">
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
            placeholder="Telefon (+905...)"
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

          <input
            type="password"
            placeholder="Şifre (Tekrar)"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />

          {/* Şirket oluşturma */}
          <input
            type="text"
            placeholder="Şirket Adı (Kurucuysan)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />

          {/* Paket seçimi (sadece kurucular için) */}
          {companyName && (
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="free">Ücretsiz</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          )}

          {/* Şirkete katılma */}
          <input
            type="text"
            placeholder="Davet Kodu (Katılıyorsan)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
          >
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
