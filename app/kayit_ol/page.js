"use client";

import { useState } from "react";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// UUID (v1–v5/v7) için gevşek ama güvenli kontrol (sadece format)
const isUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((v || "").trim());

export default function SignupPage() {
  const supabase = sbBrowser();

  // form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [companyId, setCompanyId] = useState(""); // ← doğrudan company_id

  // ui
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;
    setMessage("");

    if (password !== password2) {
      setMessage("⚠️ Şifreler uyuşmuyor.");
      return;
    }
    if (!companyId.trim() || !isUUID(companyId)) {
      setMessage("⚠️ Geçerli bir Şirket ID (UUID) girin.");
      return;
    }

    setLoading(true);

    const base = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || process.env.NEXT_PUBLIC_BASE_URL;
    const redirectTo = (base ? base.replace(/\/$/, "") : window.location.origin) + "/auth/callback";
    const normalizedEmail = (email || "").trim().toLowerCase();

    // metadata: callback/girişte okunacak
    const metadata = {
      full_name: (fullName || "").trim(),
      phone: phone || "",
      company_id: companyId.trim(), // ← anahtarımız
      // inviteCode: companyId.trim(), // (istenirse geçmiş uyumluluk için açık bırakılabilir)
    };

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: metadata, emailRedirectTo: redirectTo },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
          setMessage("⚠️ Bu e-posta zaten kayıtlı. Lütfen giriş yapın.");
        } else if (msg.includes("rate limit")) {
          setMessage("⚠️ Çok hızlı deneme yaptınız. Biraz sonra tekrar deneyin.");
        } else {
          setMessage("❌ Hata: " + error.message);
        }
        setLoading(false);
        return;
      }

      setSignedUp(true);
      setPassword(""); setPassword2("");
      try { localStorage.setItem("signup_pending_email", normalizedEmail); } catch {}
      setMessage("✅ Kayıt başarılı! E-postana doğrulama linki gönderildi.");
    } catch (err) {
      setMessage("❌ Beklenmedik hata: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || signedUp;

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
            disabled={disabled}
          />

          <PhoneInput
            country="tr"
            value={phone}
            onChange={(val) => setPhone("+" + val)}
            inputClass="!w-full !h-10 !px-3 !py-2 !rounded-lg !border"
            placeholder="Telefon (+90...)"
            inputProps={{ name: "phone", required: true }}
            disableDropdown
            countryCodeEditable={false}
            buttonClass="!hidden"
            disabled={disabled}
          />

          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={disabled}
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={disabled}
            autoComplete="new-password"
          />

          <input
            type="password"
            placeholder="Şifre (Tekrar)"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={disabled}
            autoComplete="new-password"
          />

          {/* Doğrudan Şirket ID */}
          <input
            type="text"
            placeholder="Şirket ID (UUID)"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
            disabled={disabled}
          />

          <button
            type="submit"
            disabled={disabled}
            className={`w-full py-2 rounded-lg text-white ${
              disabled ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:opacity-90"
            }`}
          >
            {loading ? "Kaydediliyor..." : signedUp ? "Onay Bekleniyor" : "Kayıt Ol"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}

        <p className="mt-6 text-center text-sm">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="text-blue-600 hover:underline">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}
