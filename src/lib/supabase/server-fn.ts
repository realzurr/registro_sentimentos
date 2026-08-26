import { createClient, type User } from "@supabase/supabase-js";

export async function getUserFromToken(token: string): Promise<User | null> {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}
