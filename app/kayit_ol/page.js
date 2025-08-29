// app/kayit_ol/page.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export default function SignupPage() {
  // # Form state'leri
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // # Şirket kurma / davet ile katılım
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // # Plan: ENUM ile uyumlu (trial | starter | pro | enterprise)
  const [plan, setPlan] = useState("trial");

  // # UI state'leri
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  // # Aynı anda hem kurucu hem davet olmasın
  const onChangeCompany = (v) => {
    setCompanyName(v);
    if (v) setInviteCode("");
  };
  const onChangeInvite = (v) => {
    setInviteCode(v);
    if (v) setCompanyName("");
  };

  // # Signup handler
  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");

    // # İkinci kez tıklamayı engelle
    if (signedUp) {
      setMessage("⚠️ Lütfen e-postanı kontrol et. Doğrulamadan tekrar kayıt olamazsın.");
      return;
    }

    setLoading(true);
    try {
      // # 1) Basit validasyonlar
      if (password !== password2) {
        setMessage("⚠️ Şifreler uyuşmuyor!");
        return;
      }
      if (!companyName && !inviteCode) {
        setMessage("⚠️ Lütfen ya şirket adı girin ya da davet kodu girin.");
        return;
      }
      if (companyName && !plan) {
        setMessage("⚠️ Şirket kuruyorsanız bir paket seçmelisiniz.");
        return;
      }

      // # 2) Davet ile katılım ise: mail gitmeden ÖNCE davet kodunu ve üye limitini doğrula
      if (inviteCode && !companyName) {
        const trimmed = inviteCode.trim();

        // # (Opsiyonel) uuid format kontrolü – hatayı erken yakalar
        const looksUuid = /^[0-9a-fA-F-]{36}$/.test(trimmed);
        if (!looksUuid) {
          setMessage("❌ Geçersiz davet kodu formatı.");
          return;
        }

        // # RPC: precheck_invite → company var mı + member limit dolu mu?
        const { data: pre, error: preErr } = await supabase.rpc("precheck_invite", {
          p_company: trimmed,
        });

        if (preErr) {
          // # RPC bulunamazsa kullanıcıya açık mesaj (SQL tarafını sonra kontrol edersin)
          setMessage("❌ Davet kodu doğrulanamadı. Lütfen daha sonra tekrar deneyin.");
          return;
        }

        const info = pre?.[0];
        if (!info?.company_id) {
          setMessage("❌ Geçersiz davet kodu. Böyle bir şirket bulunamadı.");
          return;
        }

        if (info.member_limit !== null && info.current_members >= info.member_limit) {
          setMessage("❌ Bu şirkette üye limiti dolmuş. Yeni kullanıcı eklenemez.");
          return;
        }
      }

      // # 3) Redirect URL (Supabase e-mail doğrulama sonrası buraya dönecek)
      const baseEnv =
        process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || process.env.NEXT_PUBLIC_BASE_URL;
      const redirectTo = baseEnv
        ? `${baseEnv.replace(/\/$/, "")}/auth/callback`
        : `${window.location.origin}/auth/callback`;

      // # 4) E-postayı normalize et
      const normalizedEmail = email.trim().toLowerCase();

      // # 5) Supabase Auth → sadece kullanıcıyı ve metadata'yı kaydeder
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // # Metadata: callback'te okuyup gerçek DB kayıtlarını yapacağız
          data: { full_name: fullName, phone, companyName, inviteCode, plan },
          emailRedirectTo: redirectTo,
        },
      });

      // # 6) Hata yakalama
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
          setMessage("⚠️ Bu e-posta zaten kayıtlı. Lütfen giriş yapın.");
        } else if (msg.includes("rate limit")) {
          setMessage("⚠️ Çok hızlı deneme yaptınız. Lütfen biraz sonra tekrar deneyin.");
        } else {
          setMessage("❌ Hata: " + error.message);
        }
        return;
      }

      // # 7) Başarılı → email gönderildi uyarısı
      setSignedUp(true);
      setPassword("");
      setPassword2("");
      try {
        localStorage.setItem("signup_pending_email", normalizedEmail);
      } catch {}

      setMessage(
        "✅ Kayıt başarılı! E-postana doğrulama linki gönderildi. Onayladıktan sonra otomatik olarak devam edeceksin."
      );
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
          {/* # Ad Soyad */}
          <input
            type="text"
            placeholder="Ad Soyad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={formDisabled}
          />

          {/* # Telefon (ülke sabit +90) */}
          <PhoneInput
            country={"tr"}
            value={phone}
            onChange={(val) => setPhone("+" + val)}
            inputClass="!w-full !h-10 !px-3 !py-2 !rounded-lg !border"
            placeholder="Telefon (+90...)"
            inputProps={{ name: "phone", required: true }}
            disableDropdown={true}
            countryCodeEditable={false}
            buttonClass="!hidden"
            disabled={formDisabled}
          />

          {/* # E-posta */}
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={formDisabled}
          />

          {/* # Şifre */}
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

          {/* # Şifre (Tekrar) */}
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

          {/* # Şirket kurma alanı */}
          <input
            type="text"
            placeholder="Şirket Adı (Kurucuysan)"
            value={companyName}
            onChange={(e) => onChangeCompany(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={formDisabled}
          />

          {/* # Plan seçimi (sadece kurucu ise) */}
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

          {/* # Davet ile katılım alanı */}
          <input
            type="text"
            placeholder="Davet Kodu (Katılıyorsan)"
            value={inviteCode}
            onChange={(e) => onChangeInvite(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={formDisabled}
          />

          {/* # Buton */}
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

        {/* # Mesaj alanı */}
        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}

        {/* # Giriş linki */}
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
