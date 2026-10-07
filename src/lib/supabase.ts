import { createClient } from "@supabase/supabase-js";

// Retrieve environment variables with Vite import.meta.env safely
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://your-supabase-project.supabase.co");

// Create the Supabase client with safe fallback to avoid crashes on load
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase is not yet configured. The application is running on local fallback static data."
  );
}
