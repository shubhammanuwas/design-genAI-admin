import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function getAdminSession() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, isAdmin: false };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Could not verify the Google session: ${userError.message}`);
  if (!user) return { supabase, user: null, isAdmin: false };

  if (user.app_metadata.provider !== "google") {
    return { supabase, user, isAdmin: false };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not verify admin access: ${error.message}`);
  return { supabase, user, isAdmin: profile?.is_superadmin === true };
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.supabase) throw new Error("Supabase is not configured.");
  if (!session.user) throw new Error("Sign in with Google to continue.");
  if (!session.isAdmin) throw new Error("This Google account is not enabled as a superadmin.");
  return { supabase: session.supabase, user: session.user };
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session.supabase || !session.user) redirect("/login");
  if (session.user.app_metadata.provider !== "google") redirect("/login?reason=google");
  return session;
}
