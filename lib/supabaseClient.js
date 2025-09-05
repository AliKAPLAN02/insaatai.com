"use client";
import { sbBrowser } from "./supabaseBrowserClient";

// Eski kodlarla uyum için singleton client
export const supabase = sbBrowser();
export default supabase;
