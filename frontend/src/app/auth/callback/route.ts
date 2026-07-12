import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "@/lib/env";

// Supabase redirects the email-verification link here. We exchange the code (or
// token_hash) for a session, set the auth cookies, then send the user to `next`.
// Without this, the link lands on a protected page before the session exists and
// the middleware bounces it to /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const { url, key } = getSupabaseBrowserConfig();
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  let error = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
