"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sbBrowser } from "@/lib/supabaseBrowserClient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = sbBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Girişten sonra: metadata.company_id → company_member upsert
  const processInviteMembership = async () => {
    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr || !ures?.user) throw new Error(uerr?.message || "Kullanıcı okunamadı");
    const user = ures.user;

    const meta = user.user_metadata || {};
    // company_id birincil; inviteCode/companyId eski uyumluluk
    const companyIdMeta = String(meta.company_id || meta.inviteCode || meta.companyId || "").trim();
    if (!companyIdMeta) return; // metadata yoksa iş yok

    const { error: upErr } = await supabase
      .from("company_member")
      .upsert(
        [{ company_id: companyIdMeta, user_id: user.id, role: "calisan" }],
        { onConflict: "company_id,user_id" }
      );
    if (upErr) throw new Error("company_member upsert: " + upErr.message);

    // tek seferlik metadata temizliği
    await supabase.auth.updateUser({ data: { company_id: null, inviteCode: null } });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("❌ Giriş hatası: " + error.message);
      setLoading(false);
      return;
    }

    try {
      await processInviteMembership();
    } catch (err) {
      setMessage("❌ Üyelik kurulumu hatası: " + (err?.message || err));
      console.error("[processInviteMembership]", err);
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-lg hover:opacity-90"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}

        <p className="mt-6 text-center text-sm">
          Hesabınız yok mu?{" "}
          <Link href="/kayit_ol" className="text-blue-600 hover:underline">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}
