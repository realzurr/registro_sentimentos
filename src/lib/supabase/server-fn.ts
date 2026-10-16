import { createSupabaseServerClient } from "./server";
import type { User } from "@supabase/supabase-js";

export async function getUserFromSession(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
