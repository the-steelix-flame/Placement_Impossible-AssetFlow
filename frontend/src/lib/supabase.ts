"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "@/lib/env";

export function createSupabaseClient() {
  const { url, key } = getSupabaseBrowserConfig();

  if (!url || !key) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  return createBrowserClient(url, key);
}

export const supabase = createSupabaseClient();
