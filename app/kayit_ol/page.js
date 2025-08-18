"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  const [inviteCode, setInviteCode] = useState(""); // şirket katılım kodu için

  // === KAYIT ===
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
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
    } else {
      setMessage("✅ Kayıt başarılı! Lütfen e-postandaki doğrulama linkine tıkla.");
      setVerified(true);
    }
    setLoading(false);
  };

  // === ŞİRKET OLUŞTUR ===
  const handleCreateCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("❌ Önce giriş yapmalısınız.");
      return;
    }

    const { data, error } = await supabase
      .from("company")
      .insert([{ name: fullName + " Şirketi", owner: user.id }])
      .select()
      .single();

    if (error) {
      setMessage("❌ Şirket oluşturulamadı: " + error.message);
    } else {
      setMessage(`✅ Şirket oluşturuldu! Davet kodunuz: ${data.id}`);
    }
  };

  // === ŞİRKETE KATIL ===
  const handleJoinCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("❌ Önce giriş yapmalısınız.");
      return;
    }

    if (!inviteCode) {
      setMessage("⚠️ Lütfen davet kodunu girin.");
      return;
    }

    const { error } = await supabase
      .from("company_member")
      .insert([{ company_id: inviteCode, user_id: user.id }]);

    if (error) {
      setMessage("❌ Katılma hatası: " + error.message);
    } else {
      setMessage("✅ Şirkete başarıyla katıldınız!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Kayıt Ol</h1>

        {/* KAYIT FORMU */}
        <form onSubmit={handleSignup} className="space-y-4">
          <input type="text" placeholder="Ad Soyad"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          <input type="tel" placeholder="Telefon (+905... formatında)"
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          <input type="email" placeholder="E-posta"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />
          <input type="password" placeholder="Şifre"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" required />

          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90">
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        {/* MESAJ */}
        {message && <p className="mt-4 text-center text-sm">{message}</p>}

        {/* KAYIT SONRASI BUTONLAR */}
        {verified && (
          <div className="mt-6 border-t pt-4 text-center space-y-3">
            <p className="font-medium">Doğrulama sonrası:</p>

            <button
              onClick={handleCreateCompany}
              className="w-full px-3 py-2 rounded-lg border hover:bg-gray-50"
            >
              🏢 Şirket Oluştur (Kurucu ol)
            </button>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Davet Kodu"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleJoinCompany}
                className="w-full px-3 py-2 rounded-lg border hover:bg-gray-50"
              >
                🔗 Davet ile Katıl
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
