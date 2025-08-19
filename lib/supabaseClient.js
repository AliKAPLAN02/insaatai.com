import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase environment variables eksik!");
}

if (process.env.NODE_ENV === "development") {
  console.log("✅ Supabase URL:", supabaseUrl);
  console.log(
    "✅ Supabase Anon Key (ilk 10 karakter):",
    supabaseAnonKey?.substring(0, 10)
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
