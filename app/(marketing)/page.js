
"use client";

import Link from "next/link";
import { useRef } from "react";
import { Hammer, LineChart, MessageSquare } from "lucide-react";
import Spline from "@splinetool/react-spline";

// 👇 public/spline/ içine koyduğun export dosyalarıyla eşleşmeli
const SCENE_PATH = "/spline/scene.splinecode";

export default function Page() {
  const tiltRef = useRef(null);
  const rafRef = useRef(0);

  const onMove = (e) => {
    if (
      matchMedia("(pointer: coarse)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    const el = tiltRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;

    const rx = Math.max(-5, Math.min(5, -dy * 6));
    const ry = Math.max(-8, Math.min(8, dx * 10));

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0) scale(1.01)`;
    });
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0) scale(1.01)";
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">İA</div>
          <span className="font-semibold">İnşaat AI</span>
        </div>
      </header>

      <section className="flex-1 w-full px-6 lg:px-10 pb-10">
        <div className="w-full flex flex-col lg:flex-row items-stretch gap-8">
          {/* Sol kolon */}
          <div className="w-full lg:basis-[640px] lg:shrink-0 lg:grow-0">
            <div className="text-left space-y-6">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Hala <span className="text-blue-600">yapay zeka </span> kullanmıyor musunuz?
              </h1>
              <p className="text-slate-600">
                Yapay zekayı bugün kullanın, yarın öne geçin..
              </p>
              <div className="flex items-center gap-3">
                <Link href="/pricing" className="px-5 py-2.5 rounded-xl bg-slate-900 text-white">Bilgi Al</Link>
                <Link href="/pricing" className="px-5 py-2.5 rounded-xl border border-slate-300">Fiyatları Gör</Link>
              </div>

              <div className="pt-6">
                <div className="text-xs tracking-wider text-slate-500 font-semibold mb-2">ÖZELLİKLERİ KEŞFET</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    {
                      icon: <MessageSquare className="h-6 w-6" />,
                      title: "WhatsApp’tan Yönet",
                      lines: ["Sadece WhatsApp ile sahadan ya da ofisten tüm verilerinizi kolayca yönetin."],
                      href: "/#ozellik-whatsapp",
                    },
                    {
                      icon: <LineChart className="h-6 w-6" />,
                      title: "Anında Akıllı Raporlar",
                      lines: ["Verileriniz saniyeler içinde kârlılık, nakit akışı ve borç takibi raporlarına dönüşsün."],
                      href: "/#ozellik-dashboard",
                    },
                    {
                      icon: <Hammer className="h-6 w-6" />,
                      title: "Müteahhitlere Özel Yapay Zeka",
                      lines: ["İnşaat sektörüne özel geliştirilen, müteahhitlerin iş akışını bilen ilk yapay zeka."],
                      href: "/#ozellik-insaat",
                    },
                  ].map((c, i) => (
                    <Link
                      key={i}
                      href={c.href}
                      className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow transition group"
                    >
                      <div className="h-12 w-12 rounded-xl bg-slate-100 grid place-items-center mb-4">{c.icon}</div>
                      <div className="text-xl font-semibold mb-1 group-hover:text-slate-900">{c.title}</div>
                      {c.lines.map((t, j) => (
                        <div key={j} className="text-sm text-slate-600">{t}</div>
                      ))}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sağ: Spline kutusu */}
          <div
            className="relative flex-1 rounded-[28px] border border-slate-200 shadow-lg bg-slate-100/70 min-h-[620px] h-[88vh]"
            style={{ perspective: "1000px" }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          >
            {/* Butonlar */}
            <div className="absolute right-4 top-4 z-10 flex items-center gap-3">
              <Link href="/signup" className="px-4 py-2 rounded-xl bg-white/80 backdrop-blur border border-slate-200">Kayıt Ol</Link>
              <Link href="/app" className="px-4 py-2 rounded-xl bg-slate-900 text-white">Giriş</Link>
            </div>

            {/* Clipper + Tilt */}
            <div
              className="absolute inset-0 overflow-hidden rounded-[inherit]"
              style={{ clipPath: "inset(0 round 28px)", background: "#A0ABB5" }}
            >
              <div
                ref={tiltRef}
                className="absolute inset-0 will-change-transform"
                style={{ transformStyle: "preserve-3d", transform: "scale(1.01)" }}
              >
                {/* 👇 UZAK URL GİTTİ, LOKAL DOSYA KULLANIYORUZ */}
                <Spline scene={SCENE_PATH} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-xs text-slate-500 px-6 lg:px-10 pb-5">
        <div className="w-full text-right">© {new Date().getFullYear()} İnşaat AI</div>
      </footer>
    </main>
  );
}
