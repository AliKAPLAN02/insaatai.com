"use client";
import { createBrowserClient } from "@supabase/ssr";

let _client;
export function sbBrowser() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if ((!url || !anon) && process.env.NODE_ENV !== "production") {
      console.warn("[supabaseBrowserClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    _client = createBrowserClient(url ?? "", anon ?? "");
  }
  return _client;
}
