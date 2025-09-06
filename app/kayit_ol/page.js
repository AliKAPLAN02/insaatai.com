// app/kayit_ol/page.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const PLAN_OPTIONS = ["Deneme Sürümü", "Başlangıç", "Profesyonel", "Kurumsal"];

const isUUIDv4 = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((v || "").trim());

export default function SignupPage() {
  const supabase = useMemo(() => sbBrowser(), []);

  // Form alanları
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // Akış seçimi
  const [companyName, setCompanyName] = useState(""); // kurucu akışı
  const [companyId, setCompanyId] = useState("");     // katılma akışı (UUID)

  const [plan, setPlan] = useState("Deneme Sürümü");

  // UI
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const onChangeCompanyName = (v) => {
    const val = (v || "").trimStart();
    setCompanyName(val);
    if (val) setCompanyId("");
  };
  const onChangeCompanyId = (v) => {
    const val = (v || "").trim();
    setCompanyId(val);
    if (val) setCompanyName("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");

    if (password !== password2) {
      setMessage("⚠️ Şifreler uyuşmuyor.");
      return;
    }

    const isFounder = !!companyName.trim();
    const isJoiner = !!companyId.trim();

    if (!isFounder && !isJoiner) {
      setMessage("⚠️ Lütfen ya şirket adı girin (kurucu) ya da Şirket ID (UUID) girin (katılımcı).");
      return;
    }
    if (isFounder && isJoiner) {
      setMessage("⚠️ Aynı anda hem şirket adı hem Şirket ID girilemez. Birini tercih edin.");
      return;
    }
    if (isJoiner && !isUUIDv4(companyId)) {
      setMessage("⚠️ Şirket ID (UUID v4) geçersiz görünüyor.");
      return;
    }

    setLoading(true);

    const base = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || process.env.NEXT_PUBLIC_BASE_URL;
    const redirectTo = (base ? base.replace(/\/$/, "") : window.location.origin) + "/auth/callback";

    const normalizedEmail = (email || "").trim().toLowerCase();

    const safePlan = isFounder
      ? (PLAN_OPTIONS.includes(plan) ? plan : "Deneme Sürümü")
      : null;

    // Küçük debug/izleme kolaylığı için flow bayrağı da ekledim (opsiyonel)
    const metadata = {
      full_name: (fullName || "").trim(),
      phone: phone || "",
      companyName: isFounder ? companyName.trim() : null,
      company_id: isJoiner ? companyId.trim() : null,
      inviteCode: isJoiner ? companyId.trim() : null,
      plan: safePlan,
      flow: isFounder ? "founder" : "joiner",
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

      setSignedUp(true);
      setPassword("");
      setPassword2("");
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
            autoComplete="name"
            required
            disabled={disabled}
          />

          <PhoneInput
            country="tr"
            value={phone}
            onChange={(val) => setPhone(val ? "+" + val : "")}
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
            autoComplete="email"
            required
            disabled={disabled}
          />

          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            autoComplete="new-password"
            required
            disabled={disabled}
          />

          <input
            type="password"
            placeholder="Şifre (Tekrar)"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            autoComplete="new-password"
            required
            disabled={disabled}
          />

          {/* Kurucu alanı */}
          <input
            type="text"
            placeholder="Şirket Adı (Kurucuysan)"
            value={companyName}
            onChange={(e) => onChangeCompanyName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={disabled}
          />

          {/* Paket seçimi — sadece kurucuysa göster */}
          {companyName.trim() && (
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={disabled}
            >
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Katılma alanı — doğrudan company_id */}
          <input
            type="text"
            placeholder="Şirket ID (UUID — Katılıyorsan)"
            value={companyId}
            onChange={(e) => onChangeCompanyId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
            title="UUID v4 formatında olmalı"
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
