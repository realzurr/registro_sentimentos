import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  createRegistro,
  getRegistroById,
  listRegistrosByUser,
  listTodosRegistros,
  updateRegistro,
  deleteRegistro,
} from "../../src/lib/db.server";
import { createTestDb, closeTestDb } from "../helpers/setup";
import { USER_A, USER_B } from "../fixtures/users";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("User isolation — cross-user access denied", () => {
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
    createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-25",
        virtude: "humildade",
        modalidade: "grupo",
        emocao_atual: '["bem"]',
        descricao_acoes: "A2",
      },
      db,
    );

    expect(listRegistrosByUser(USER_A.id, db)).toHaveLength(2);
    expect(listRegistrosByUser(USER_B.id, db)).toHaveLength(0);
  });

  it("user B cannot get user A's record by id", () => {
    const created = createRegistro(
      {
        user_id: USER_A.id,
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "secret",
      },
      db,
    );

    expect(getRegistroById(created.id, USER_A.id, db)).not.toBeNull();
    expect(getRegistroById(created.id, USER_B.id, db)).toBeNull();
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

    const result = updateRegistro(created.id, USER_B.id, { emocao_atual: '["hacked"]' }, db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("não encontrado");

    const original = getRegistroById(created.id, USER_A.id, db);
    expect(original!.emocao_atual).toBe('["ok"]');
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

    const result = deleteRegistro(created.id, USER_B.id, db);
    expect(result.ok).toBe(false);
    expect(result.erro).toContain("não encontrado");

    expect(getRegistroById(created.id, USER_A.id, db)).not.toBeNull();
  });

  it("user A and user B can each have their own records", () => {
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
        user_id: USER_B.id,
        data_registro: "2026-08-26",
        virtude: "humildade",
        modalidade: "grupo",
        emocao_atual: '["bem"]',
        descricao_acoes: "B",
      },
      db,
    );

    expect(listRegistrosByUser(USER_A.id, db)).toHaveLength(1);
    expect(listRegistrosByUser(USER_A.id, db)[0].descricao_acoes).toBe("A");
    expect(listRegistrosByUser(USER_B.id, db)).toHaveLength(1);
    expect(listRegistrosByUser(USER_B.id, db)[0].descricao_acoes).toBe("B");
  });

  it("admin sees all records across users", () => {
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
        user_id: USER_B.id,
        data_registro: "2026-08-26",
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
});
