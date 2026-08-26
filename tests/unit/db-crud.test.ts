import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  createRegistro,
  getRegistroById,
  listRegistrosByUser,
  updateRegistro,
  deleteRegistro,
  listTodosRegistros,
  podeModificar,
  type RegistroVirtude,
} from "../../src/lib/db.server";
import { JANELA_EDICAO_MS } from "../../src/lib/constants";
import { createTestDb, closeTestDb } from "../helpers/setup";
import { createSampleRegistro } from "../fixtures/registros";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("podeModificar", () => {
  it("returns true when record is within edit window", () => {
    const registro = {
      id: 1,
      user_id: "u1",
      data_registro: "2026-08-26",
      criado_em: new Date().toISOString(),
      atualizado_em: null,
      virtude: "paciencia",
      modalidade: "individual" as const,
      emocao_atual: '["tranquilo"]',
      sintomas_atuais: null,
      descricao_acoes: "teste",
    };
    expect(podeModificar(registro)).toBe(true);
  });

  it("returns false when record is outside edit window", () => {
    const past = new Date(Date.now() - JANELA_EDICAO_MS - 1000);
    const registro = {
      id: 1,
      user_id: "u1",
      data_registro: "2026-08-26",
      criado_em: past.toISOString(),
      atualizado_em: null,
      virtude: "paciencia",
      modalidade: "individual" as const,
      emocao_atual: '["tranquilo"]',
      sintomas_atuais: null,
      descricao_acoes: "teste",
    };
    expect(podeModificar(registro)).toBe(false);
  });

  it("uses atualizado_em as base when present", () => {
    const recent = new Date(Date.now() - 60_000);
    const old = new Date(Date.now() - JANELA_EDICAO_MS - 1000);
    const registro = {
      id: 1,
      user_id: "u1",
      data_registro: "2026-08-26",
      criado_em: old.toISOString(),
      atualizado_em: recent.toISOString(),
      virtude: "paciencia",
      modalidade: "individual" as const,
      emocao_atual: '["tranquilo"]',
      sintomas_atuais: null,
      descricao_acoes: "teste",
    };
    expect(podeModificar(registro)).toBe(true);
  });
});

describe("createRegistro", () => {
  it("creates record with auto-set timestamps and returns it", () => {
    const dados = createSampleRegistro({ user_id: "user-a" });
    const result = createRegistro(dados, db);

    expect(result.id).toBeTypeOf("number");
    expect(result.user_id).toBe("user-a");
    expect(result.criado_em).toBeTruthy();
    expect(result.atualizado_em).toBeNull();
    expect(result.virtude).toBe("paciencia");
    expect(result.modalidade).toBe("individual");
  });

  it("rejects invalid modalidade via CHECK constraint", () => {
    expect(() => {
      db.prepare(
        `INSERT INTO registros_virtudes (user_id, data_registro, criado_em, virtude, modalidade, emocao_atual, descricao_acoes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        "u1",
        "2026-08-26",
        new Date().toISOString(),
        "paciencia",
        "invalido",
        '["ok"]',
        "desc",
      );
    }).toThrow();
  });
});

describe("getRegistroById", () => {
  it("returns record when found with correct user_id", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const found = getRegistroById(created.id, "user-a", db);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it("returns null when user_id does not match", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const found = getRegistroById(created.id, "user-b", db);
    expect(found).toBeNull();
  });

  it("returns null for non-existent id", () => {
    const found = getRegistroById(9999, "user-a", db);
    expect(found).toBeNull();
  });
});

describe("listRegistrosByUser", () => {
  it("returns empty array for user with no records", () => {
    const result = listRegistrosByUser("nonexistent-user", db);
    expect(result).toEqual([]);
  });

  it("returns only the specified user records", () => {
    createRegistro(createSampleRegistro({ user_id: "user-a", virtude: "paciencia" }), db);
    createRegistro(createSampleRegistro({ user_id: "user-a", virtude: "humildade" }), db);
    createRegistro(createSampleRegistro({ user_id: "user-b", virtude: "fe" }), db);

    const result = listRegistrosByUser("user-a", db);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.user_id === "user-a")).toBe(true);
  });

  it("orders by data_registro DESC then criado_em DESC", () => {
    createRegistro(createSampleRegistro({ user_id: "u1", data_registro: "2026-08-20" }), db);
    createRegistro(createSampleRegistro({ user_id: "u1", data_registro: "2026-08-26" }), db);
    createRegistro(createSampleRegistro({ user_id: "u1", data_registro: "2026-08-23" }), db);

    const result = listRegistrosByUser("u1", db);
    expect(result[0].data_registro).toBe("2026-08-26");
    expect(result[1].data_registro).toBe("2026-08-23");
    expect(result[2].data_registro).toBe("2026-08-20");
  });
});

describe("updateRegistro", () => {
  it("succeeds within edit window and sets atualizado_em", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const result = updateRegistro(created.id, "user-a", { emocao_atual: '["grato"]' }, db);

    expect(result.ok).toBe(true);
    const updated = getRegistroById(created.id, "user-a", db);
    expect(updated!.emocao_atual).toBe('["grato"]');
    expect(updated!.atualizado_em).not.toBeNull();
  });

  it("fails when user_id does not match", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const result = updateRegistro(created.id, "user-b", { emocao_atual: '["hack"]' }, db);

    expect(result.ok).toBe(false);
    expect(result.erro).toContain("não encontrado");
  });

  it("fails when edit window has expired", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const past = new Date(Date.now() - JANELA_EDICAO_MS - 1000).toISOString();
    db.prepare(
      "UPDATE registros_virtudes SET criado_em = ?, atualizado_em = NULL WHERE id = ?",
    ).run(past, created.id);

    const result = updateRegistro(created.id, "user-a", { emocao_atual: '["alterado"]' }, db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("expirou");
  });

  it("preserves unchanged fields", () => {
    const created = createRegistro(
      createSampleRegistro({
        user_id: "user-a",
        virtude: "humildade",
        modalidade: "grupo",
        descricao_acoes: "descricao original",
      }),
      db,
    );

    updateRegistro(created.id, "user-a", { emocao_atual: '["grato"]' }, db);
    const updated = getRegistroById(created.id, "user-a", db);

    expect(updated!.virtude).toBe("humildade");
    expect(updated!.modalidade).toBe("grupo");
    expect(updated!.descricao_acoes).toBe("descricao original");
    expect(updated!.emocao_atual).toBe('["grato"]');
  });
});

describe("deleteRegistro", () => {
  it("succeeds within edit window", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const result = deleteRegistro(created.id, "user-a", db);

    expect(result.ok).toBe(true);
    expect(getRegistroById(created.id, "user-a", db)).toBeNull();
  });

  it("fails when user_id does not match", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const result = deleteRegistro(created.id, "user-b", db);

    expect(result.ok).toBe(false);
    expect(getRegistroById(created.id, "user-a", db)).not.toBeNull();
  });

  it("fails when edit window has expired", () => {
    const created = createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    const past = new Date(Date.now() - JANELA_EDICAO_MS - 1000).toISOString();
    db.prepare(
      "UPDATE registros_virtudes SET criado_em = ?, atualizado_em = NULL WHERE id = ?",
    ).run(past, created.id);

    const result = deleteRegistro(created.id, "user-a", db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("expirou");
  });
});

describe("listTodosRegistros", () => {
  it("returns all records with no filters", () => {
    createRegistro(createSampleRegistro({ user_id: "a" }), db);
    createRegistro(createSampleRegistro({ user_id: "b" }), db);

    const result = listTodosRegistros(undefined, db);
    expect(result).toHaveLength(2);
  });

  it("filters by date range", () => {
    createRegistro(createSampleRegistro({ user_id: "a", data_registro: "2026-08-20" }), db);
    createRegistro(createSampleRegistro({ user_id: "a", data_registro: "2026-08-26" }), db);
    createRegistro(createSampleRegistro({ user_id: "a", data_registro: "2026-09-01" }), db);

    const result = listTodosRegistros({ de: "2026-08-25", ate: "2026-08-31" }, db);
    expect(result).toHaveLength(1);
    expect(result[0].data_registro).toBe("2026-08-26");
  });

  it("filters by userId", () => {
    createRegistro(createSampleRegistro({ user_id: "user-a" }), db);
    createRegistro(createSampleRegistro({ user_id: "user-b" }), db);

    const result = listTodosRegistros({ userId: "user-a" }, db);
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe("user-a");
  });

  it("returns empty array when no records match", () => {
    createRegistro(createSampleRegistro({ user_id: "a" }), db);
    const result = listTodosRegistros({ de: "2099-01-01" }, db);
    expect(result).toEqual([]);
  });
});
