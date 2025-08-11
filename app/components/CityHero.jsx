"use client";
import { useEffect, useState } from "react";

export default function CityHero({
  url = "/spline/scene.splinecode", // public/spline/scene.splinecode
  className = "",
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window !== "undefined" && !customElements.get("spline-viewer")) {
        await import("@splinetool/viewer");
      }
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div
      className={`relative h-[420px] md:h-[560px] rounded-3xl overflow-hidden shadow-xl bg-slate-100 ${className}`}
      suppressHydrationWarning
    >
      {ready ? (
        <spline-viewer
          url={url}
          style={{ width: "100%", height: "100%" }}
          events-target="global"
        />
      ) : (
        <div className="w-full h-full grid place-items-center text-slate-500 text-sm">
          Spline sahnesi yükleniyor…
        </div>
      )}
    </div>
  );
}
