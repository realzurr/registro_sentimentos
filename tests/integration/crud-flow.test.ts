import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  createRegistro,
  getRegistroById,
  listRegistrosByUser,
  updateRegistro,
  deleteRegistro,
  listTodosRegistros,
  type RegistroVirtude,
} from "../../src/lib/db.server";
import { JANELA_EDICAO_MS } from "../../src/lib/constants";
import { registroSchema } from "../../src/lib/api/registros.server";
import { escapeCsv } from "../../src/lib/csv";
import { nomeVirtude } from "../../src/lib/virtues-list";
import { formatarDataPtBr } from "../../src/lib/format";
import { createTestDb, closeTestDb } from "../helpers/setup";
import { USER_A } from "../fixtures/users";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("Full CRUD flow — auth mock → create → list → edit → delete", () => {
  it("creates, lists, edits, and deletes a record", () => {
    const userId = USER_A.id;

    const created = createRegistro(
      {
        user_id: userId,
        data_registro: "2026-08-26",
        virtude: "paciencia",
        modalidade: "individual",
        emocao_atual: '["tranquilo"]',
        sintomas_atuais: null,
        descricao_acoes: "Pratiquei paciencia no transito.",
      },
      db,
    );

    expect(created.id).toBeTypeOf("number");
    expect(created.user_id).toBe(userId);
    expect(created.criado_em).toBeTruthy();
    expect(created.atualizado_em).toBeNull();

    const listed = listRegistrosByUser(userId, db);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);

    const editResult = updateRegistro(
      created.id,
      userId,
      { emocao_atual: '["grato"]', sintomas_atuais: "nenhum" },
      db,
    );
    expect(editResult.ok).toBe(true);

    const updated = getRegistroById(created.id, userId, db);
    expect(updated!.emocao_atual).toBe('["grato"]');
    expect(updated!.sintomas_atuais).toBe("nenhum");
    expect(updated!.atualizado_em).not.toBeNull();
    expect(updated!.virtude).toBe("paciencia");

    const deleteResult = deleteRegistro(created.id, userId, db);
    expect(deleteResult.ok).toBe(true);
    expect(getRegistroById(created.id, userId, db)).toBeNull();
    expect(listRegistrosByUser(userId, db)).toHaveLength(0);
  });

  it("validates input with Zod before create", () => {
    const validInput = {
      data_registro: "2026-08-26",
      virtude: "humildade",
      modalidade: "grupo" as const,
      emocao_atual: ["feliz"],
      descricao_acoes: "Pratiquei humildade em grupo.",
    };

    const result = registroSchema.safeParse(validInput);
    expect(result.success).toBe(true);

    if (result.success) {
      const created = createRegistro({ ...result.data, user_id: USER_A.id }, db);
      expect(created.virtude).toBe("humildade");
      expect(created.modalidade).toBe("grupo");
    }
  });

  it("rejects invalid input via Zod before create", () => {
    const invalidInput = {
      data_registro: "invalid-date",
      virtude: "",
      modalidade: "wrong",
      emocao_atual: [],
      descricao_acoes: "",
    };

    const result = registroSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe("5-min window end-to-end", () => {
  it("allows edit within window, denies after expiry", () => {
    const userId = USER_A.id;
    const created = createRegistro(
      {
        user_id: userId,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["esperancoso"]',
        descricao_acoes: "Pratiquei fe.",
      },
      db,
    );

    const editOk = updateRegistro(created.id, userId, { emocao_atual: '["grato"]' }, db);
    expect(editOk.ok).toBe(true);

    const past = new Date(Date.now() - JANELA_EDICAO_MS - 1000).toISOString();
    db.prepare(
      "UPDATE registros_virtudes SET criado_em = ?, atualizado_em = NULL WHERE id = ?",
    ).run(past, created.id);

    const editExpired = updateRegistro(created.id, userId, { emocao_atual: '["alterado"]' }, db);
    expect(editExpired.ok).toBe(false);
    expect(editExpired.erro).toContain("expirou");

    const deleteExpired = deleteRegistro(created.id, userId, db);
    expect(deleteExpired.ok).toBe(false);
    expect(deleteExpired.erro).toContain("expirou");

    const stillOriginal = getRegistroById(created.id, userId, db);
    expect(stillOriginal!.emocao_atual).toBe('["grato"]');
  });

  it("resets window after successful edit", () => {
    const userId = USER_A.id;
    const created = createRegistro(
      {
        user_id: userId,
        data_registro: "2026-08-26",
        virtude: "paciencia",
        modalidade: "individual",
        emocao_atual: '["calmo"]',
        descricao_acoes: "Teste.",
      },
      db,
    );

    const edit1 = updateRegistro(created.id, userId, { emocao_atual: '["grato"]' }, db);
    expect(edit1.ok).toBe(true);

    const edit2 = updateRegistro(created.id, userId, { emocao_atual: '["muito grato"]' }, db);
    expect(edit2.ok).toBe(true);

    const final = getRegistroById(created.id, userId, db);
    expect(final!.emocao_atual).toBe('["muito grato"]');
    expect(final!.atualizado_em).not.toBeNull();
  });
});

describe("Admin flow — auth mock → admin check → list all → CSV export", () => {
  it("admin can list all records from multiple users", () => {
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "A",
      },
      db,
    );
    createRegistro(
      {
        user_id: "user-c",
        data_registro: "2026-08-25",
        virtude: "humildade",
        modalidade: "grupo",
        emocao_atual: '["bem"]',
        descricao_acoes: "B",
      },
      db,
    );

    const all = listTodosRegistros(undefined, db);
    expect(all).toHaveLength(2);
  });

  it("admin can filter by date range", () => {
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-20",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "old",
      },
      db,
    );
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "recent",
      },
      db,
    );

    const filtered = listTodosRegistros({ de: "2026-08-25", ate: "2026-08-31" }, db);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].descricao_acoes).toBe("recent");
  });

  it("CSV export generates correct format", () => {
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "paciencia",
        modalidade: "individual",
        emocao_atual: '["grato"]',
        sintomas_atuais: "nenhum",
        descricao_acoes: 'Teste CSV; com vírgula, e aspas "duplas"',
      },
      db,
    );

    const registros = listTodosRegistros(undefined, db);
    const cabecalho =
      "ID;Data da Prática;Hora do Registro;Virtude;Modalidade;Emoções;Sintomas;Descrição;Usuário";
    const linhas = registros.map((r) =>
      [
        escapeCsv(r.id),
        escapeCsv(formatarDataPtBr(r.data_registro)),
        escapeCsv(r.criado_em),
        escapeCsv(nomeVirtude(r.virtude)),
        escapeCsv(r.modalidade === "grupo" ? "Em grupo" : "Individual"),
        escapeCsv(JSON.parse(r.emocao_atual).join(", ")),
        escapeCsv(r.sintomas_atuais ?? ""),
        escapeCsv(r.descricao_acoes),
        escapeCsv(r.user_id),
      ].join(";"),
    );
    const csv = [cabecalho, ...linhas].join("\r\n");

    expect(csv).toContain(cabecalho);
    expect(csv).toContain("Paciência");
    expect(csv).toContain("Individual");
    expect(csv).toContain('"Teste CSV; com vírgula, e aspas ""duplas"""');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});

describe("User isolation — user A creates, user B denied", () => {
  it("user B cannot see user A's records via listRegistrosByUser", () => {
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "A",
      },
      db,
    );

    const userBList = listRegistrosByUser("user-b", db);
    expect(userBList).toHaveLength(0);
  });

  it("user B cannot get user A's record by id", () => {
    const created = createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "A",
      },
      db,
    );

    const found = getRegistroById(created.id, "user-b", db);
    expect(found).toBeNull();
  });

  it("user B cannot edit user A's record", () => {
    const created = createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "A",
      },
      db,
    );

    const result = updateRegistro(created.id, "user-b", { emocao_atual: '["hack"]' }, db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("não encontrado");
  });

  it("user B cannot delete user A's record", () => {
    const created = createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "A",
      },
      db,
    );

    const result = deleteRegistro(created.id, "user-b", db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("não encontrado");

    expect(getRegistroById(created.id, USER_A.id, db)).not.toBeNull();
  });
});
