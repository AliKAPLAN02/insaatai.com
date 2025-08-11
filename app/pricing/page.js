export default function Pricing() {
  const plans = [
    { name: "Basic", price: "₺699/ay",  items: ["WhatsApp Inbox", "Raporlar (CSV)", "1 proje"] },
    { name: "Pro",   price: "₺999/ay",  items: ["Dashboard + Aging", "Sınırsız proje", "Ödeme uyarıları"], featured: true },
    { name: "Team",  price: "₺1599/ay", items: ["Kullanıcı rolleri", "Özel alanlar", "Öncelikli destek"] },
  ];

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Fiyatlandırma</h1>

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <section
            key={p.name}
            aria-labelledby={`plan-${p.name}`}
            className={`rounded-2xl bg-white border p-6 shadow-sm ${
              p.featured ? "border-slate-900 ring-2 ring-slate-200" : "border-slate-200"
            }`}
          >
            <h2 id={`plan-${p.name}`} className="text-lg font-semibold">{p.name}</h2>
            <div className="text-2xl font-extrabold mt-1">{p.price}</div>

            <ul className="mt-4 text-sm text-slate-600 list-disc pl-5 space-y-1.5">
              {p.items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>

            <button
              type="button"
              className={`mt-6 w-full px-4 py-2 rounded-xl ${
                p.featured ? "bg-slate-900 text-white" : "border border-slate-300"
              }`}
            >
              Başla
            </button>
          </section>
        ))}
      </div>
    </main>
  );
}