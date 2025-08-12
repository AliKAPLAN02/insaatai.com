// app/signup/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

const PLAN_LABELS = { basic: "Basic", pro: "Pro", team: "Team" };

export default function SignupPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const plan = sp.get("plan") || "basic";

  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  async function onSubmit(e) {
    e.preventDefault();

    // şimdilik “mock”: localStorage’a yaz ve panele geç
    localStorage.setItem("signup", JSON.stringify({ email, company, plan }));
    router.push(`/app?plan=${plan}`);
  }

  return (
    <main className="min-h-screen max-w-lg mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Kayıt Ol</h1>
      <p className="text-slate-600 mb-6">Seçilen plan: <strong>{PLAN_LABELS[plan] ?? "Basic"}</strong></p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">E-posta</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="ornek@firma.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Firma / İsim</label>
          <input
            type="text"
            required
            value={company}
            onChange={e => setCompany(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Örn: Kaplan İnşaat"
          />
        </div>

        <button type="submit" className="w-full rounded-xl bg-slate-900 text-white py-2">Devam Et</button>
      </form>
    </main>
  );
}
