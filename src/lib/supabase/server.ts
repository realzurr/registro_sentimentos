import { createServerClient } from "@supabase/ssr";
import { getRequest, setCookie, deleteCookie } from "@tanstack/react-start/server";

export function createSupabaseServerClient() {
  const request = getRequest();

  return createServerClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const raw = request.headers.get("cookie") ?? "";
          const pairs = raw.split(";").filter(Boolean);
          return pairs.map((pair) => {
            const idx = pair.indexOf("=");
            return {
              name: pair.slice(0, idx).trim(),
              value: decodeURIComponent(pair.slice(idx + 1).trim()),
            };
          });
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            setCookie(name, value, {
              path: "/",
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 365,
              ...options,
            });
          }
        },
      },
    },
  );
}

export function clearSupabaseCookies() {
  const names = ["sb-access-token", "sb-refresh-token"];
  for (const name of names) {
    deleteCookie(name, { path: "/" });
  }
}
