import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function isValidHttpUrl(candidate?: string): boolean {
  if (!candidate || candidate.includes("YOUR_PROJECT_REF")) return false;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidAnonKey(candidate?: string): boolean {
  return Boolean(candidate && !candidate.startsWith("YOUR_") && candidate.length > 20);
}

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  isValidHttpUrl(rawUrl) &&
  isValidAnonKey(rawKey)
);

/** Browser-safe Supabase client. Never put a service-role key in NEXT_PUBLIC_* variables. */
export const supabase = isSupabaseConfigured
  ? createClient(rawUrl!, rawKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
