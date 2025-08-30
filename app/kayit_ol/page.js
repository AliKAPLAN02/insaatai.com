// app/kayit_ol/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Veritabanındaki billing_plan ENUM değerleriyle birebir aynı OLMALI
const PLAN_OPTIONS = ["Deneme Sürümü", "Başlangıç", "Profesyonel", "Kurumsal"];

// UUID (v4) kaba kontrolü
const isUUIDv4 = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "");

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // Akış seçimi
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // 🔹 Varsayılan plan: enum ile birebir
  const [plan, setPlan] = useState("Deneme Sürümü");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  // Kurucu ↔ Davet alanlarını karşılıklı temizle
  const onChangeCompany = (v) => {
    const val = (v || "").trimStart();
    setCompanyName(val);
    if (val) setInviteCode("");
  };
  const onChangeInvite = (v) => {
    const val = (v || "").trim();
    setInviteCode(val);
    if (val) setCompanyName("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");

    // Basit doğrulamalar
    if (password !== password2) {
      setMessage("⚠️ Şifreler uyuşmuyor!");
      return;
    }
    if (!companyName.trim() && !inviteCode.trim()) {
      setMessage("⚠️ Lütfen ya şirket adı girin ya da davet kodu girin.");
      return;
    }
    if (inviteCode && !isUUIDv4(inviteCode)) {
      setMessage("⚠️ Davet kodu (UUID) geçersiz görünüyor.");
      return;
    }

    setLoading(true);

    // Doğrulama linki için redirect
    const baseEnv =
      process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || process.env.NEXT_PUBLIC_BASE_URL;
    const redirectTo = baseEnv
      ? `${baseEnv.replace(/\/$/, "")}/auth/callback`
      : `${window.location.origin}/auth/callback`;

    const normalizedEmail = (email || "").trim().toLowerCase();

    // Kurucu akışında planı whitelist et; geçersizse "Deneme Sürümü"ne düş
    const safePlan = companyName.trim()
      ? PLAN_OPTIONS.includes(plan)
        ? plan
        : "Deneme Sürümü"
      : null; // davet akışında plan KULLANILMAZ

    // Metadata (callback şirket/üyelik kurulumunda kullanılacak)
    const metadata = {
      full_name: (fullName || "").trim(),
      phone: phone || "",
      companyName: companyName.trim() || null,
      inviteCode: inviteCode.trim() || null,
      plan: safePlan, // sadece kurucuysa dolu
    };

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
          setMessage("⚠️ Bu e-posta zaten kayıtlı. Lütfen giriş yapın.");
        } else if (msg.includes("rate limit")) {
          setMessage("⚠️ Çok hızlı deneme yaptınız. Lütfen biraz sonra tekrar deneyin.");
        } else {
          setMessage("❌ Hata: " + error.message);
        }
        setLoading(false);
        return;
      }

      // Başarılı
      setSignedUp(true);
      setPassword("");
      setPassword2("");
      try {
        localStorage.setItem("signup_pending_email", normalizedEmail);
      } catch {}
      setMessage("✅ Kayıt başarılı! E-postana doğrulama linki gönderildi.");
    } catch (err) {
      setMessage("❌ Beklenmedik hata: " + (err?.message || String(err)));
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

          {/* Paket seçimi — sadece kurucuysa göster */}
          {companyName.trim() && (
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={formDisabled}
            >
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Davet alanı */}
          <input
            type="text"
            placeholder="Davet Kodu (UUID — Katılıyorsan)"
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
