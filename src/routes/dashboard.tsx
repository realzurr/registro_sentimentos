import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { dadosDashboard, analiseDashboard } from "@/lib/api/dashboard.server";
import type { PeriodoDashboard } from "@/lib/api/dashboard.server";
import { slugParaNomeEmocao } from "@/lib/emotions-list";
import {
  GraficoRadarComparativo,
  GraficoEvolucao,
  GraficoTopEmocoes,
} from "@/components/graficos-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Meu Dashboard — Agenda de Virtudes" }],
  }),
  component: Dashboard,
});

const periodos: { chave: PeriodoDashboard; rotulo: string }[] = [
  { chave: "semana", rotulo: "Semana" },
  { chave: "mes", rotulo: "Mês" },
  { chave: "todos", rotulo: "Todo Período" },
];

function Dashboard() {
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("todos");
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState<string | null>(null);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-usuario", periodo],
    queryFn: async () => dadosDashboard({ data: { periodo } }),
    enabled: true,
  });

  const carregado = data && data.ok;

  const radar = useMemo(() => {
    if (!carregado) return null;
    const todas = new Set<string>([
      ...Object.keys(data.usuario_emocoes),
      ...Object.keys(data.grupo_emocoes),
    ]);
    const keys = [...todas].sort().slice(0, 12);
    return {
      labels: keys.map(slugParaNomeEmocao),
      usuario: keys.map((k) => data.usuario_emocoes[k] ?? 0),
      grupo: keys.map((k) => data.grupo_emocoes[k] ?? 0),
    };
  }, [carregado, data]);

  const evolucao = useMemo(() => {
    if (!carregado) return null;
    const semanas = new Set<string>([
      ...data.usuario_evolucao.map((u) => u.semana),
      ...data.grupo_evolucao.map((g) => g.semana),
    ]);
    const ordenadas = [...semanas].sort();
    const usuarioMap: Record<string, number> = {};
    data.usuario_evolucao.forEach((u) => (usuarioMap[u.semana] = u.total));
    const grupoMap: Record<string, number> = {};
    data.grupo_evolucao.forEach((g) => (grupoMap[g.semana] = g.total));
    return {
      labels: ordenadas.map((s) => s.replace("-S", " S")),
      usuario: ordenadas.map((s) => usuarioMap[s] ?? 0),
      grupo: ordenadas.map((s) => grupoMap[s] ?? 0),
    };
  }, [carregado, data]);

  const topEmocoes = useMemo(() => {
    if (!carregado) return null;
    const todas = new Set<string>([
      ...Object.keys(data.usuario_emocoes),
      ...Object.keys(data.grupo_emocoes),
    ]);
    const keys = [...todas]
      .sort((a, b) => (data.grupo_emocoes[b] ?? 0) - (data.grupo_emocoes[a] ?? 0))
      .slice(0, 10);
    return {
      labels: keys.map(slugParaNomeEmocao),
      usuario: keys.map((k) => data.usuario_emocoes[k] ?? 0),
      grupo: keys.map((k) => data.grupo_emocoes[k] ?? 0),
    };
  }, [carregado, data]);

  const handleAnalisar = useCallback(async () => {
    setAnalisando(true);
    setErroAnalise(null);
    const res = await analiseDashboard({ data: { periodo } });
    setAnalisando(false);
    if (res.ok) {
      setAnalise(res.analise);
    } else {
      setErroAnalise(res.erro);
    }
  }, [periodo]);

  const metricas = carregado ? data.metricas : null;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Meu Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evolução das suas virtudes em comparação com o grupo.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {periodos.map((p) => (
            <button
              key={p.chave}
              onClick={() => setPeriodo(p.chave)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                periodo === p.chave
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !carregado ? (
          <Card className="mt-6">
            <CardContent className="p-6">
              <p className="text-sm text-red-500">
                {isError || !data ? "Não foi possível carregar o dashboard." : data.erro}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{metricas?.total_usuario}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Meus Registros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{metricas?.total_grupo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Total Grupo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{metricas?.media_grupo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Média/Usuário</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="truncate text-3xl font-bold text-primary">
                    {metricas?.top_emocao_usuario}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Minha Top Emoção</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Perfil Emocional Comparativo</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Azul = Você | Laranja = Média do Grupo
                </p>
              </CardHeader>
              <CardContent>
                {radar ? (
                  <GraficoRadarComparativo {...radar} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Evolução Semanal</CardTitle>
                <p className="text-xs text-muted-foreground">Sólido = Você | Tracejado = Grupo</p>
              </CardHeader>
              <CardContent>
                {evolucao ? (
                  <GraficoEvolucao {...evolucao} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Top 10 Emoções — Comparativo</CardTitle>
                <p className="text-xs text-muted-foreground">Azul = Você | Cinza = Grupo</p>
              </CardHeader>
              <CardContent>
                {topEmocoes ? (
                  <GraficoTopEmocoes {...topEmocoes} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader className="text-center">
                <CardTitle>Análise Inteligente</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Análise gerada pelo Xamãs com base nos seus dados
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <div>
                  <Button onClick={handleAnalisar} disabled={analisando}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {analisando ? "Analisando..." : "Analisar com o Xamã"}
                  </Button>
                </div>
                {erroAnalise && <p className="text-sm text-red-500">{erroAnalise}</p>}
                {analise && (
                  <div className="w-full max-w-3xl rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed">{analise}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
