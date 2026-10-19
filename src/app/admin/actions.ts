"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}

export async function createGeneration(formData: FormData) {
  const { supabase } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const photo = formData.get("photo");

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Choose a valid profile.");
  if (!prompt || prompt.length > 500 || !caption || caption.length > 500) {
    throw new Error("Prompt and caption must each be between 1 and 500 characters.");
  }
  if (!(photo instanceof File) || !allowedImageTypes.has(photo.type) || photo.size === 0 || photo.size > maxImageSize) {
    throw new Error("Choose a JPEG, PNG, or WebP image smaller than 5 MB.");
  }

  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("generation-photos")
    .upload(path, photo, { contentType: photo.type, upsert: false });
  if (uploadError) throw new Error(`Could not upload the media: ${uploadError.message}`);

  const { error: insertError } = await supabase.from("generations").insert({
    user_id: userId,
    photo_path: path,
    prompt,
    caption,
  });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from("generation-photos").remove([path]);
    if (cleanupError) console.error("Could not clean up the image after generation insert failed", cleanupError);
    throw new Error(`Could not create the media record: ${insertError.message}`);
  }

  revalidatePath("/");
  redirect("/?notice=created");
}

export async function updateGeneration(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Choose a valid media record.");
  if (!prompt || prompt.length > 500 || !caption || caption.length > 500) {
    throw new Error("Prompt and caption must each be between 1 and 500 characters.");
  }

  const { error } = await supabase
    .from("generations")
    .update({ prompt, caption })
    .eq("id", id);
  if (error) throw new Error(`Could not update the media record: ${error.message}`);

  revalidatePath("/");
  redirect("/?notice=updated");
}

export async function deleteGeneration(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Choose a valid media record.");

  const { data: generation, error: lookupError } = await supabase
    .from("generations")
    .select("photo_path")
    .eq("id", id)
    .single();
  if (lookupError) throw new Error(`Could not load the media record: ${lookupError.message}`);

  const { error: deleteError } = await supabase.from("generations").delete().eq("id", id);
  if (deleteError) throw new Error(`Could not delete the media record: ${deleteError.message}`);

  const { count, error: referencesError } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("photo_path", generation.photo_path);
  if (referencesError) throw new Error(`Media record deleted, but could not check image references: ${referencesError.message}`);

  if (count === 0) {
    const { error: storageError } = await supabase.storage
      .from("generation-photos")
      .remove([generation.photo_path]);
    if (storageError) throw new Error(`Media record deleted, but its image could not be removed: ${storageError.message}`);
  }

  revalidatePath("/");
  redirect("/?notice=deleted");
}
