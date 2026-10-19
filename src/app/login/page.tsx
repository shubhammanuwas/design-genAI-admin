import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { GoogleSignInButton } from "./sign-in-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const { supabase, user, isAdmin } = await getAdminSession();
  if (isAdmin) redirect("/");
  const params = await searchParams;
  const signedInButDenied = Boolean(user);

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark">S<span>+</span></div>
        <p className="eyebrow">CAPTION STUDIO · OPERATIONS</p>
        <h1>Good work deserves<br />a good back office.</h1>
        <p className="login-copy">
          A private window into the people, images, and reactions shaping the studio.
        </p>
        {signedInButDenied ? (
          <div className="denied-note" role="alert">
            <strong>This account is not an administrator.</strong>
            <span>Ask the project owner to enable <code>profiles.is_superadmin</code> for your Google profile.</span>
          </div>
        ) : (
          <GoogleSignInButton />
        )}
        {!supabase ? <p className="form-error">Supabase environment variables are not configured.</p> : null}
        {params.reason === "google" ? <p className="form-error">Use the Google account configured for this admin area.</p> : null}
        {params.error ? <p className="form-error">Google sign-in did not complete. Check the OAuth redirect configuration and try again.</p> : null}
        <p className="login-foot">ACCESS IS RESTRICTED · GOOGLE + SUPERADMIN ROLE REQUIRED</p>
      </section>
    </main>
  );
}
