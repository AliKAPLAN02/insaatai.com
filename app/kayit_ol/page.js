// app/kayit_ol/page.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export default function SignupPage() {
  // Form state
  const [fullName, setFullName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [password2, setPassword2] = useState("");

  // Kurucu / Davet akışı
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode]   = useState("");
  const [plan, setPlan]               = useState("trial"); // trial | starter | pro | enterprise

  // UI
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const [signedUp, setSignedUp] = useState(false);

  // Alanlar birbirini dışlasın
  const onChangeCompany = (v) => {
    setCompanyName(v);
    if (v) setInviteCode("");
  };
  const onChangeInvite = (v) => {
    setInviteCode(v);
    if (v) setCompanyName("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");
    setLoading(true);

    try {
      // Basit kontroller
      if (password !== password2) {
        setMessage("⚠️ Şifreler uyuşmuyor.");
        return;
      }
      if (!companyName && !inviteCode) {
        setMessage("⚠️ Ya şirket adı girin ya da davet kodu girin.");
        return;
      }
      if (companyName && inviteCode) {
        setMessage("⚠️ Şirket adı ile davet kodu aynı anda kullanılamaz.");
        return;
      }

      // (Opsiyonel) Davet kodu UUID format kontrolü
      if (inviteCode && !companyName) {
        const looksUuid = /^[0-9a-fA-F-]{36}$/.test(inviteCode.trim());
        if (!looksUuid) {
          setMessage("❌ Geçersiz davet kodu formatı.");
          return;
        }
      }

      // Redirect URL (email doğrulama dönüş adresi)
      const base =
        process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        window.location.origin;
      const emailRedirectTo = `${base.replace(/\/$/, "")}/auth/callback`;

      // E-posta normalize
      const normalizedEmail = email.trim().toLowerCase();

      // Metadata: callback bu bilgilerle patron/çalışan eklemeyi yapacak
      const meta = {
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        companyName: companyName?.trim() || null,                          // kurucuysa dolu
        inviteCode: companyName ? null : (inviteCode?.trim() || null),      // davetle ise dolu
        plan: companyName ? plan : null,                                    // sadece kurucu seçer
      };

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: meta,
          emailRedirectTo,
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
          setMessage("⚠️ Bu e-posta zaten kayıtlı. Lütfen giriş yapın.");
        } else if (msg.includes("rate limit")) {
          setMessage("⚠️ Çok hızlı denediniz. Biraz sonra tekrar deneyin.");
        } else {
          setMessage("❌ Hata: " + error.message);
        }
        return;
      }

      // Başarılı
      setSignedUp(true);
      setPassword("");
      setPassword2("");
      try { localStorage.setItem("signup_pending_email", normalizedEmail); } catch {}
      setMessage("✅ Kayıt başarılı! E-postana doğrulama linki gönderildi.");
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loading || signedUp;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
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
            disabled={formDisabled}
          />

          <PhoneInput
            country={"tr"}
            value={phone}
            onChange={(val) => setPhone("+" + val)}
            inputClass="!w-full !h-10 !px-3 !py-2 !rounded-lg !border"
            placeholder="Telefon (+90...)"
            inputProps={{ name: "phone", required: true }}
            disableDropdown
            countryCodeEditable={false}
            buttonClass="!hidden"
            disabled={formDisabled}
          />

          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={formDisabled}
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={formDisabled}
            autoComplete="new-password"
          />

          <input
            type="password"
            placeholder="Şifre (Tekrar)"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={formDisabled}
            autoComplete="new-password"
          />

          {/* Kurucu alanı */}
          <input
            type="text"
            placeholder="Şirket Adı (Kurucuysan)"
            value={companyName}
            onChange={(e) => onChangeCompany(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={formDisabled}
          />

          {companyName && (
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={formDisabled}
            >
              <option value="trial">Deneme</option>
              <option value="starter">Başlangıç</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Kurumsal</option>
            </select>
          )}

          {/* Davet alanı */}
          <input
            type="text"
            placeholder="Davet Kodu (Katılıyorsan)"
            value={inviteCode}
            onChange={(e) => onChangeInvite(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={formDisabled}
          />

          <button
            type="submit"
            disabled={formDisabled}
            className={`w-full py-2 rounded-lg text-white ${
              formDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:opacity-90"
            }`}
          >
            {loading ? "Kaydediliyor..." : signedUp ? "Onay Bekleniyor" : "Kayıt Ol"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}

        <p className="mt-6 text-center text-sm">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="text-blue-600 hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
