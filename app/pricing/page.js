// app/pricing/page.js
import Link from "next/link";

export default function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "₺/ay",
      items: [
        "yapay zeka destekli Whatsapp üzerinden inşaat ai",
        "Anında Exel Raporları",
        "1 proje hakkı",
      ],
    },
    {
      name: "Pro",
      price: "₺/ay",
      items: [
        "özelleştirilebilir filtreleme özelikleri ",
        "3 proje hakkı",
        "Htırlatma ve borç takibi mesajları",
      ],
      featured: true,
    },
    {
      name: "Team",
      price: "₺/ay",
      items: [
        "Şirketinize özel inşaat yapay zekası",
        "Sınırsız proje",
        "7/24 canlı destek ve",
      ],
    },
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
            <h2 id={`plan-${p.name}`} className="text-lg font-semibold">
              {p.name}
            </h2>
            <div className="text-2xl font-extrabold mt-1">{p.price}</div>

            <ul className="mt-4 text-sm text-slate-600 list-disc pl-5 space-y-1.5">
              {p.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>

            <Link
              href={{ pathname: "/kayit_ol", query: { plan: p.name.toLowerCase() } }}
              aria-label={`${p.name} planı ile başla`}
              className={`mt-6 inline-flex w-full items-center justify-center px-4 py-2 rounded-xl transition ${
                p.featured
                  ? "bg-slate-900 text-white hover:opacity-90"
                  : "border border-slate-300 hover:bg-slate-50"
              }`}
              data-plan={p.name}
            >
              Başla
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
