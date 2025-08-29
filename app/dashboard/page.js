"use client";

export default function DashboardHome() {
  return (
    <>
      {/* SAYFA-İÇİ test uyarısı */}
      <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 mb-2">
        PAGE İÇİ – eğer layout yoksa bu uyarı hemen kartın üstünde görünür.
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6">
        <h1 className="text-2xl font-semibold mb-2">📊 Dashboard</h1>
        <p>İskelet hazır. İçerikleri sonra ekleyeceğiz.</p>
      </div>
    </>
  );
}
