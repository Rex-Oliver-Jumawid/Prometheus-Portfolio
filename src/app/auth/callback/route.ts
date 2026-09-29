import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/config/env";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const siteUrl = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();

  let error: Error | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    }));
  } else {
    error = new Error("Missing authentication callback parameters.");
  }

  if (error) {
    return NextResponse.redirect(new URL("/auth/error", siteUrl));
  }

  return NextResponse.redirect(new URL(next, siteUrl));
}
