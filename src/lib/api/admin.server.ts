import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromToken } from "../supabase/server-fn";
import { getDb, listTodosRegistros } from "../db.server";
import { nomeVirtude } from "../virtues-list";
import { slugParaNomeEmocao } from "../emotions-list";
import { slugParaNomeSintoma } from "../symptoms-list";
import { isAdminEmail } from "../admin-email";
import { escapeCsv } from "../csv";

export const listarTodosAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      de: z.string().optional(),
      ate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getUserFromToken(data.token);
    if (!user) {
      return { ok: false as const, erro: "Não autenticado." };
    }

    const conn = getDb();
    if (isAdminEmail(user.email)) {
      conn.prepare(`INSERT OR IGNORE INTO papeis (user_id, role) VALUES (?, 'admin')`).run(user.id);
    }

    const row = conn.prepare(`SELECT role FROM papeis WHERE user_id = ?`).get(user.id) as
      { role: string } | undefined;

    if (row?.role !== "admin") {
      return { ok: false as const, erro: "Sem permissão" };
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
      token: z.string(),
      de: z.string().optional(),
      ate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getUserFromToken(data.token);
    if (!user) {
      return { ok: false as const, erro: "Não autenticado." };
    }

    const conn = getDb();
    if (isAdminEmail(user.email)) {
      conn.prepare(`INSERT OR IGNORE INTO papeis (user_id, role) VALUES (?, 'admin')`).run(user.id);
    }

    const row = conn.prepare(`SELECT role FROM papeis WHERE user_id = ?`).get(user.id) as
      { role: string } | undefined;

    if (row?.role !== "admin") {
      return { ok: false as const, erro: "Sem permissão" };
    }

    const registros = listTodosRegistros({
      de: data.de || undefined,
      ate: data.ate || undefined,
    });

    const cabecalho =
      "ID;Data da Prática;Hora do Registro;Virtude;Modalidade;Emoções;Sintomas;Descrição;Usuário";
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
        escapeCsv(r.user_id),
      ].join(";"),
    );

    const csv = [cabecalho, ...linhas].join("\r\n");
    return { ok: true as const, csv };
  });
