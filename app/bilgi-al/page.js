"use client";
import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setOk(null); setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    setLoading(false);
    if (j.ok) { setOk(true); e.target.reset(); }
    else { setOk(false); setError(j.error || "Bilinmeyen hata"); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Bilgi Al</h1>
        <p className="text-slate-600 mb-8">Mail, telefon ve sorunuzu bırakın; en kısa sürede dönüş yapalım.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input type="text" name="website" className="hidden" aria-hidden="true" tabIndex={-1} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ad Soyad</label>
              <input name="name" required className="w-full rounded-xl border px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-posta</label>
              <input name="email" type="email" required className="w-full rounded-xl border px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input name="phone" className="w-full rounded-xl border px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Şirket</label>
              <input name="company" className="w-full rounded-xl border px-3 py-2 bg-background" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sorunuz / Mesajınız</label>
            <textarea name="message" required rows={6} className="w-full rounded-xl border px-3 py-2 bg-background" />
          </div>
          <button disabled={loading} className="inline-flex items-center rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? "Gönderiliyor…" : "Gönder"}
          </button>
          {ok === true && <p className="text-emerald-600 mt-2">Teşekkürler! Mesajınız alındı.</p>}
          {ok === false && <p className="text-rose-600 mt-2">Hata: {error}</p>}
        </form>
      </div>
    </div>
  );
}
