"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TreasuryPage() {
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("free");
  const [initialBudget, setInitialBudget] = useState("");
  const [currency, setCurrency] = useState("TRY");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // 1) Kullanıcı al
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      setMessage("❌ Kullanıcı bulunamadı, giriş yapın.");
      setLoading(false);
      return;
    }

    // 2) Supabase insert
    const { data, error } = await supabase
      .from("company")
      .insert([{
        name: companyName,
        owner: user.id,
        plan,
        initial_budget: initialBudget ? parseFloat(initialBudget) : null,
        currency,
      }])
      .select()
      .single();

    if (error) {
      setMessage("❌ Hata: " + error.message);
    } else {
      setMessage(`✅ Şirket oluşturuldu: ${data.name}`);
      setCompanyName("");
      setInitialBudget("");
      setPlan("free");
      setCurrency("TRY");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">🏢 Şirket & Hazine</h1>

      {/* Şirket Oluşturma Formu */}
      <form onSubmit={handleCreateCompany} className="space-y-4">
        <input
          type="text"
          placeholder="Şirket Adı"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          required
        />

        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="free">Ücretsiz</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Başlangıç Bütçesi"
            value={initialBudget}
            onChange={(e) => setInitialBudget(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-32 border rounded-lg px-3 py-2"
          >
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
        >
          {loading ? "Oluşturuluyor..." : "Şirket Oluştur"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
