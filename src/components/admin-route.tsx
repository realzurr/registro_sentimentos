import { useAuth } from "@/lib/auth";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/api/admin-users.server";
import { Button } from "@/components/ui/button";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return false;
      return checkIsAdmin({ data: { token } });
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.navigate({ to: "/login" });
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && isLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <h1 className="text-3xl font-semibold mb-3">Acesso restrito</h1>
        <p className="text-muted-foreground mb-6">Você precisa estar logado.</p>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <h1 className="text-3xl font-semibold mb-3">Sem permissão</h1>
        <p className="text-muted-foreground mb-6">Você não tem acesso ao painel administrativo.</p>
        <Button variant="outline" asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
