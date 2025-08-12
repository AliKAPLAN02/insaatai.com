"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const defaultPlan = (qs.get("plan") || "Basic");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      ad: form.get("ad"),
      soyad: form.get("soyad"),
      email: form.get("email"),
      telefon: form.get("telefon"),
      sirket_adi: form.get("sirket_adi"),
      sifre: form.get("sifre"),
      abonelik_turu: form.get("abonelik_turu"),
    };

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok && data.ok) {
      setMsg("Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz…");
      setTimeout(() => router.push("/giris"), 1000);
    } else {
      setMsg(data.error || "Bir hata oluştu.");
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Kayıt Ol</h1>

      <form onSubmit={onSubmit} className="max-w-xl grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input name="ad" placeholder="Ad" className="border rounded-xl p-3" required />
          <input name="soyad" placeholder="Soyad" className="border rounded-xl p-3" required />
        </div>

        <input name="email" type="email" placeholder="E-posta" className="border rounded-xl p-3" required />
        <input name="telefon" placeholder="Telefon (WhatsApp)" className="border rounded-xl p-3" required />
        <input name="sirket_adi" placeholder="Şirket adı (opsiyonel)" className="border rounded-xl p-3" />
        <input name="sifre" type="password" placeholder="Şifre (min 6 karakter)" className="border rounded-xl p-3" required />

        <label className="text-sm text-slate-600">Abonelik</label>
        <select name="abonelik_turu" defaultValue={defaultPlan} className="border rounded-xl p-3">
          <option>Basic</option>
          <option>Pro</option>
          <option>Team</option>
        </select>

        <button
          disabled={loading}
          className="mt-2 px-5 py-3 rounded-xl bg-slate-900 text-white disabled:opacity-50"
        >
          {loading ? "Kaydediliyor…" : "Hesap Oluştur"}
        </button>

        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </main>
  );
}
