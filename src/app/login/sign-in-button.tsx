"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function GoogleSignInButton() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setError("");
    setPending(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Add the Supabase URL and publishable key to the app environment.");
      setPending(false);
      return;
    }
    const supabase = createBrowserClient(url, key);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (authError) {
      setError(authError.message);
      setPending(false);
    }
  }

  return (
    <div className="sign-in-actions">
      <button className="google-button" type="button" onClick={signIn} disabled={pending}>
        <span aria-hidden="true">G</span>
        {pending ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
