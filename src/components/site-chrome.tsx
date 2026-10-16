import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Registro do dia" },
  { to: "/meus-registros", label: "Meus registros" },
  { to: "/dashboard", label: "Meu Dashboard" },
];

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/login" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          Agenda de Virtudes
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Menu principal">
          {user &&
            links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  location.pathname === l.to
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          {user && (
            <Link
              to="/admin"
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                location.pathname === "/admin"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Painel admin
            </Link>
          )}
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="ml-2 gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          )}
        </nav>

        <button
          className="p-2 text-muted-foreground md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border md:hidden" aria-label="Menu mobile">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            {user &&
              links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={closeMenu}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    location.pathname === l.to
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            {user && (
              <Link
                to="/admin"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Painel admin
              </Link>
            )}
            {user ? (
              <button
                onClick={() => {
                  closeMenu();
                  handleSignOut();
                }}
                className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Sair
              </button>
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 text-sm font-medium text-primary"
              >
                Entrar
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        Desenvolvido com ❤️ por 🧙🏽‍♂️ Renato Peixoto para Tenda do Xamãs
        <p>Copyright by ©Tenda do Xamãs - 2026</p>
      </div>
    </footer>
  );
}
