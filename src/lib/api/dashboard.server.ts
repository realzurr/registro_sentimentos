import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromSession } from "../supabase/server-fn";
import { listTodosRegistros, listRegistrosByUser } from "../db.server";
import { slugParaNomeEmocao } from "../emotions-list";
import { parseEmocoes } from "../parse-utils";

export type PeriodoDashboard = "semana" | "mes" | "todos";

export type DadosDashboard = {
  usuario_emocoes: Record<string, number>;
  grupo_emocoes: Record<string, number>;
  usuario_evolucao: { semana: string; total: number }[];
  grupo_evolucao: { semana: string; total: number }[];
  metricas: {
    total_usuario: number;
    total_grupo: number;
    media_grupo: number;
    top_emocao_usuario: string;
    top_emocao_grupo: string;
    num_usuarios_grupo: number;
  };
};

function dataInicioDoPeriodo(periodo: PeriodoDashboard): string {
  const agora = new Date();
  if (periodo === "semana") {
    const dia = agora.getDay() === 0 ? 6 : agora.getDay() - 1;
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - dia);
    inicio.setHours(0, 0, 0, 0);
    return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(
      inicio.getDate(),
    ).padStart(2, "0")}`;
  }
  if (periodo === "mes") {
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return "0000-00-00";
}

function filtrarPorData(
  registros: { data_registro: string; emocao_atual: string }[],
  inicio: string,
): { data_registro: string; emocao_atual: string }[] {
  return registros.filter((r) => {
    const data = (r.data_registro ?? "").slice(0, 10);
    return data >= inicio;
  });
}

function contarEmocoes(registros: { emocao_atual: string }[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const r of registros) {
    for (const slug of parseEmocoes(r.emocao_atual)) {
      contagem[slug] = (contagem[slug] ?? 0) + 1;
    }
  }
  return contagem;
}

function semanaIso(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

function evolucaoSemanal(registros: { data_registro: string }[]) {
  const semanas: Record<string, number> = {};
  for (const r of registros) {
    const dataStr = (r.data_registro ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) continue;
    const [y, m, d] = dataStr.split("-").map(Number);
    const chave = semanaIso(new Date(y, m - 1, d));
    semanas[chave] = (semanas[chave] ?? 0) + 1;
  }
  return Object.entries(semanas)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([semana, total]) => ({ semana, total }));
}

function calcularDadosDashboard(userId: string, periodo: PeriodoDashboard): DadosDashboard {
  const inicio = dataInicioDoPeriodo(periodo);
  const todos = listTodosRegistros();
  const meus = listRegistrosByUser(userId);

  const grupoFiltrados = filtrarPorData(todos, inicio);
  const usuarioFiltrados = filtrarPorData(meus, inicio);

  const numUsuariosGrupo = new Set(todos.map((r) => r.user_id)).size;
  const numUsuariosGrupoSeguro = Math.max(numUsuariosGrupo, 1);

  const usuarioEmocoes = contarEmocoes(usuarioFiltrados);
  const grupoEmocoesBruto = contarEmocoes(grupoFiltrados);
  const grupoEmocoes: Record<string, number> = {};
  for (const [slug, total] of Object.entries(grupoEmocoesBruto)) {
    grupoEmocoes[slug] = Math.round((total / numUsuariosGrupoSeguro) * 100) / 100;
  }

  const topUsuario = Object.entries(usuarioEmocoes).sort((a, b) => b[1] - a[1])[0];
  const topGrupo = Object.entries(grupoEmocoesBruto).sort((a, b) => b[1] - a[1])[0];

  return {
    usuario_emocoes: usuarioEmocoes,
    grupo_emocoes: grupoEmocoes,
    usuario_evolucao: evolucaoSemanal(usuarioFiltrados),
    grupo_evolucao: evolucaoSemanal(grupoFiltrados),
    metricas: {
      total_usuario: usuarioFiltrados.length,
      total_grupo: grupoFiltrados.length,
      media_grupo: numUsuariosGrupoSeguro
        ? Math.round((grupoFiltrados.length / numUsuariosGrupoSeguro) * 10) / 10
        : 0,
      top_emocao_usuario: topUsuario ? slugParaNomeEmocao(topUsuario[0]) : "-",
      top_emocao_grupo: topGrupo ? slugParaNomeEmocao(topGrupo[0]) : "-",
      num_usuarios_grupo: numUsuariosGrupo,
    },
  };
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return "Erro interno ao processar a solicitação. Tente novamente.";
}

export const dadosDashboard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      periodo: z.enum(["semana", "mes", "todos"]).optional().default("todos"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const user = await getUserFromSession();
      if (!user) {
        return { ok: false as const, erro: "Não autenticado." };
      }
      return { ok: true as const, ...calcularDadosDashboard(user.id, data.periodo) };
    } catch (erro) {
      return {
        ok: false as const,
        erro: `Não foi possível carregar o dashboard. ${mensagemDeErro(erro)}`,
      };
    }
  });

const CACHE_TTL_MS = 30 * 60 * 1000;
const cacheAnalise = new Map<string, { analise: string; ts: number }>();

export const analiseDashboard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      periodo: z.enum(["semana", "mes", "todos"]).optional().default("todos"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const user = await getUserFromSession();
      if (!user) {
        return { ok: false as const, erro: "Não autenticado." };
      }

      if (!process.env.OPENAI_API_KEY) {
        return {
          ok: false as const,
          erro: "Ainda não há dados suficientes para realizar a análise. Essa função será liberada em breve.",
        };
      }

      const cacheKey = `${user.id}:${data.periodo}`;
      const cacheado = cacheAnalise.get(cacheKey);
      if (cacheado && Date.now() - cacheado.ts < CACHE_TTL_MS) {
        return { ok: true as const, analise: cacheado.analise, cacheado: true };
      }

      const dados = calcularDadosDashboard(user.id, data.periodo);
      const nome = user.user_metadata?.full_name || user.user_metadata?.name || undefined;

      const { gerarAnaliseOpenAI } = await import("../openai-analise.server");
      const analise = await gerarAnaliseOpenAI(nome, user.email, data.periodo, dados);

      cacheAnalise.set(cacheKey, { analise, ts: Date.now() });
      return { ok: true as const, analise, cacheado: false };
    } catch (erro) {
      return {
        ok: false as const,
        erro: `Não foi possível gerar a análise. ${mensagemDeErro(erro)}`,
      };
    }
  });
