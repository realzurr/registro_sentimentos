import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromSession } from "../supabase/server-fn";
import { getDb, listTodosRegistros } from "../db.server";
import { nomeVirtude } from "../virtues-list";
import { emocoes, slugParaNomeEmocao } from "../emotions-list";
import { slugParaNomeSintoma } from "../symptoms-list";
import { isAdminEmail } from "../admin-email";
import { escapeCsv } from "../csv";
import { parseEmocoes } from "../parse-utils";

async function requireAdmin() {
  const user = await getUserFromSession();
  if (!user) {
    return { user: null, ok: false as const, erro: "Não autenticado." };
  }

  const conn = getDb();
  if (isAdminEmail(user.email)) {
    conn.prepare(`INSERT OR IGNORE INTO papeis (user_id, role) VALUES (?, 'admin')`).run(user.id);
  }

  const row = conn.prepare(`SELECT role FROM papeis WHERE user_id = ?`).get(user.id) as
    { role: string } | undefined;

  if (row?.role !== "admin") {
    return { user: null, ok: false as const, erro: "Sem permissão" };
  }

  return { user, ok: true as const, erro: null };
}

export const listarTodosAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      de: z.string().optional(),
      ate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return { ok: false as const, erro: auth.erro };
    }

    const registros = listTodosRegistros({
      de: data.de || undefined,
      ate: data.ate || undefined,
    });

    return { ok: true as const, registros };
  });

export const exportarCsvAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      de: z.string().optional(),
      ate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return { ok: false as const, erro: auth.erro };
    }

    const registros = listTodosRegistros({
      de: data.de || undefined,
      ate: data.ate || undefined,
    });

    const cabecalho =
      "ID;Data da Prática;Hora do Registro;Virtude;Modalidade;Emoções;Sintomas;Descrição;Usuário;Email";
    const linhas = registros.map((r) =>
      [
        escapeCsv(r.id),
        escapeCsv(r.data_registro),
        escapeCsv(r.criado_em),
        escapeCsv(nomeVirtude(r.virtude)),
        escapeCsv(r.modalidade === "grupo" ? "Em grupo" : "Individual"),
        escapeCsv(
          JSON.parse(r.emocao_atual)
            .map((s: string) => slugParaNomeEmocao(s))
            .join(", "),
        ),
        escapeCsv(
          r.sintomas_atuais
            ? JSON.parse(r.sintomas_atuais)
                .map((s: string) => slugParaNomeSintoma(s))
                .join(", ")
            : "",
        ),
        escapeCsv(r.descricao_acoes),
        escapeCsv(r.user_name ?? r.user_email ?? r.user_id),
        escapeCsv(r.user_email ?? ""),
      ].join(";"),
    );

    const csv = [cabecalho, ...linhas].join("\r\n");
    return { ok: true as const, csv };
  });

export type PerfilComparativo = {
  usuarios: { user_id: string; nome: string }[];
  rotulos: string[];
  usuario: number[];
  grupo: number[];
  usuarioSelecionado: string | null;
};

function perfilEmocoes(registros: { user_id: string; emocao_atual: string }[]) {
  const total = registros.length;
  const contagem: Record<string, number> = {};
  for (const r of registros) {
    for (const slug of parseEmocoes(r.emocao_atual)) {
      contagem[slug] = (contagem[slug] ?? 0) + 1;
    }
  }
  const perfil: number[] = emocoes.map((e) =>
    total > 0 ? Math.round(((contagem[e.slug] ?? 0) / total) * 100) : 0,
  );
  return perfil;
}

export const perfilComparativoAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return { ok: false as const, erro: auth.erro };
    }

    const conn = getDb();
    const registros = listTodosRegistros(undefined, conn);

    const usuariosIds = [...new Set(registros.map((r) => r.user_id))];
    const usuarios = usuariosIds.map((id) => {
      const primeiro = registros.find((r) => r.user_id === id);
      return {
        user_id: id,
        nome: primeiro?.user_name ?? primeiro?.user_email ?? id,
      };
    });

    const alvo =
      data.userId && usuariosIds.includes(data.userId) ? data.userId : (usuariosIds[0] ?? null);

    const registrosUsuario = registros.filter((r) => r.user_id === alvo);
    const perfilUsuario = perfilEmocoes(registrosUsuario);
    const perfilGrupo = perfilEmocoes(registros);

    const resultado: PerfilComparativo = {
      usuarios,
      rotulos: emocoes.map((e) => slugParaNomeEmocao(e.slug)),
      usuario: perfilUsuario,
      grupo: perfilGrupo,
      usuarioSelecionado: alvo,
    };
    return { ok: true as const, ...resultado };
  });
