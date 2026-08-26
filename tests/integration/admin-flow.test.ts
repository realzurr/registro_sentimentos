import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createRegistro, listTodosRegistros } from "../../src/lib/db.server";
import { escapeCsv } from "../../src/lib/csv";
import { nomeVirtude } from "../../src/lib/virtues-list";
import { formatarDataPtBr } from "../../src/lib/format";
import { createTestDb, closeTestDb } from "../helpers/setup";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("Admin flow — list all + CSV export", () => {
  it("lists records from multiple users", () => {
    createRegistro(
      {
        user_id: "admin-user-a",
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
        user_id: "admin-user-b",
        data_registro: "2026-08-25",
        virtude: "humildade",
        modalidade: "grupo",
        emocao_atual: '["bem"]',
        descricao_acoes: "B",
      },
      db,
    );
    createRegistro(
      {
        user_id: "admin-user-c",
        data_registro: "2026-08-24",
        virtude: "paciencia",
        modalidade: "individual",
        emocao_atual: '["calmo"]',
        descricao_acoes: "C",
      },
      db,
    );

    const all = listTodosRegistros(undefined, db);
    expect(all).toHaveLength(3);
  });

  it("filters by date range", () => {
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-01",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "old",
      },
      db,
    );
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-15",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "mid",
      },
      db,
    );
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "recent",
      },
      db,
    );

    const filtered = listTodosRegistros({ de: "2026-08-10", ate: "2026-08-20" }, db);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].descricao_acoes).toBe("mid");
  });

  it("filters by userId", () => {
    createRegistro(
      {
        user_id: "target-user",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "target",
      },
      db,
    );
    createRegistro(
      {
        user_id: "other-user",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "other",
      },
      db,
    );

    const filtered = listTodosRegistros({ userId: "target-user" }, db);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].user_id).toBe("target-user");
  });

  it("combines date range and userId filters", () => {
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-20",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "wrong-date",
      },
      db,
    );
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "match",
      },
      db,
    );
    createRegistro(
      {
        user_id: "u2",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: "wrong-user",
      },
      db,
    );

    const filtered = listTodosRegistros({ de: "2026-08-25", ate: "2026-08-31", userId: "u1" }, db);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].descricao_acoes).toBe("match");
  });

  it("CSV export has correct header and line endings", () => {
    createRegistro(
      {
        user_id: "csv-user",
        data_registro: "2026-08-26",
        virtude: "gratidao",
        modalidade: "grupo",
        emocao_atual: '["grato"]',
        sintomas_atuais: null,
        descricao_acoes: "Ação de graças.",
      },
      db,
    );

    const registros = listTodosRegistros(undefined, db);
    const cabecalho =
      "ID;Data da Prática;Hora do Registro;Virtude;Modalidade;Emoção;Sintomas;Descrição;Usuário";
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
    expect(csv).toContain("Gratidão");
    expect(csv).toContain("Em grupo");
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("csv-user");
  });

  it("CSV escapes special characters correctly", () => {
    createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "verdade",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        sintomas_atuais: "dor; de cabeça",
        descricao_acoes: 'Texto com "aspas" e vírgula, sim.',
      },
      db,
    );

    const registros = listTodosRegistros(undefined, db);
    const r = registros[0];
    const line = [
      escapeCsv(r.id),
      escapeCsv(r.data_registro),
      escapeCsv(r.criado_em),
      escapeCsv(nomeVirtude(r.virtude)),
      escapeCsv("Individual"),
      escapeCsv(JSON.parse(r.emocao_atual).join(", ")),
      escapeCsv(r.sintomas_atuais ?? ""),
      escapeCsv(r.descricao_acoes),
      escapeCsv(r.user_id),
    ].join(";");

    expect(line).toContain('"dor; de cabeça"');
    expect(line).toContain('"Texto com ""aspas"" e vírgula, sim."');
  });
});
