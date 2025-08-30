import { createClient } from "@supabase/supabase-js";

// .env.local içinde tanımlı olmalı:
// NEXT_PUBLIC_SUPABASE_URL=...
// NEXT_PUBLIC_SUPABASE_ANON_KEY=...

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Supabase environment variables eksik!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
