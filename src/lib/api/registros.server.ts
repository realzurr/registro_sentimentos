import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromSession } from "../supabase/server-fn";
import { createRegistro, deleteRegistro, listRegistrosByUser, updateRegistro } from "../db.server";
import { emocoes } from "../emotions-list";
import { sintomas } from "../symptoms-list";

const emocaoEnum = z.enum(emocoes.map((e) => e.slug) as [string, ...string[]]);
const sintomaEnum = z.enum(sintomas.map((s) => s.slug) as [string, ...string[]]);

export const registroSchema = z.object({
  data_registro: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
      "Data inválida.",
    ),
  virtude: z.string().min(1, "Informe a virtude trabalhada."),
  modalidade: z.enum(["grupo", "individual"], {
    errorMap: () => ({ message: "Informe se a prática foi em grupo ou individual." }),
  }),
  emocao_atual: z
    .array(emocaoEnum, { message: "Selecione pelo menos uma emoção." })
    .min(1, "Selecione pelo menos uma emoção."),
  sintomas_atuais: z.array(sintomaEnum).optional().nullable(),
  descricao_acoes: z.string().min(1, "Descreva as ações realizadas.").max(5000),
});

export type RegistroInput = z.infer<typeof registroSchema>;

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }
  return "Erro interno ao processar a solicitação. Tente novamente.";
}

export const salvarRegistro = createServerFn({ method: "POST" })
  .inputValidator(registroSchema)
  .handler(async ({ data }) => {
    try {
      const user = await getUserFromSession();
      if (!user) {
        return { ok: false as const, erro: "Não autenticado." };
      }

      const registro = createRegistro({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        user_email: user.email || null,
        data_registro: data.data_registro,
        virtude: data.virtude,
        modalidade: data.modalidade,
        emocao_atual: data.emocao_atual,
        sintomas_atuais:
          data.sintomas_atuais && data.sintomas_atuais.length > 0 ? data.sintomas_atuais : null,
        descricao_acoes: data.descricao_acoes,
      });
      return { ok: true as const, registro };
    } catch (erro) {
      return {
        ok: false as const,
        erro: `Não foi possível salvar o registro. ${mensagemDeErro(erro)}`,
      };
    }
  });

export const meusRegistros = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const user = await getUserFromSession();
    if (!user) return { ok: false as const, erro: "Não autenticado." };
    return { ok: true as const, registros: listRegistrosByUser(user.id) };
  } catch (erro) {
    return {
      ok: false as const,
      erro: `Não foi possível carregar os registros. ${mensagemDeErro(erro)}`,
    };
  }
});

export const atualizarRegistro = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      campos: registroSchema.partial(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const user = await getUserFromSession();
      if (!user) return { ok: false as const, erro: "Não autenticado." };
      return updateRegistro(data.id, user.id, data.campos);
    } catch (erro) {
      return {
        ok: false as const,
        erro: `Não foi possível atualizar o registro. ${mensagemDeErro(erro)}`,
      };
    }
  });

export const excluirRegistro = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    try {
      const user = await getUserFromSession();
      if (!user) return { ok: false as const, erro: "Não autenticado." };
      return deleteRegistro(data.id, user.id);
    } catch (erro) {
      return {
        ok: false as const,
        erro: `Não foi possível excluir o registro. ${mensagemDeErro(erro)}`,
      };
    }
  });
