import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue, type SignUpData } from "@/lib/auth";

const errorMap: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos. Verifique seus dados e tente novamente.",
  "Email not confirmed":
    "Este email ainda não foi confirmado. Verifique sua caixa de entrada e confirme o cadastro.",
  "User already registered": "Já existe uma conta com este email. Faça login ou use outro email.",
  "Signup disabled": "O cadastro está temporariamente indisponível. Tente novamente mais tarde.",
  "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "Too many requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
  "Unable to validate email address: invalid format":
    "Formato de email inválido. Verifique seus dados e tente novamente.",
  "Password is too short": "A senha é muito curta. Use pelo menos 6 caracteres.",
  "Rate limit exceeded": "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
};

function translateError(message: string): string {
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) return value;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import("@/lib/supabase/client").then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient();
      clientRef.current = supabase;

      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      cleanup = () => subscription.unsubscribe();
    });

    return () => {
      cleanup?.();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = useCallback(async (email, password) => {
    const supabase = clientRef.current;
    if (!supabase) return { error: "Serviço indisponível. Atualize a página e tente novamente." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateError(error.message) };
    return {};
  }, []);

  const signUp: AuthContextValue["signUp"] = useCallback(
    async ({ email, password, fullName }: SignUpData) => {
      const supabase = clientRef.current;
      if (!supabase) return { error: "Serviço indisponível. Atualize a página e tente novamente." };
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: translateError(error.message) };
      if (data.user && !data.session) {
        return { message: "Conta criada! Verifique seu email para confirmar o cadastro." };
      }
      return {};
    },
    [],
  );

  const signOut: AuthContextValue["signOut"] = useCallback(async () => {
    const supabase = clientRef.current;
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const getToken: AuthContextValue["getToken"] = useCallback(async () => {
    const supabase = clientRef.current;
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}
