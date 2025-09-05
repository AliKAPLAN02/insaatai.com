"use client";
import { createBrowserClient } from "@supabase/ssr";

export function sbBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sadece dev’de uyarı ver
  if ((!url || !anon) && process.env.NODE_ENV !== "production") {
    console.warn("[supabaseBrowserClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url ?? "", anon ?? "");
}
