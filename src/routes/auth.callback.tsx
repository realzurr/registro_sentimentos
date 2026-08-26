import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Autenticando — Agenda de Virtudes" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .exchangeCodeForSession(window.location.search)
      .then(() => {
        router.navigate({ to: "/" });
      })
      .catch(() => {
        router.navigate({ to: "/login" });
      });
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
