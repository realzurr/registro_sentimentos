import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  createRegistro,
  getRegistroById,
  listRegistrosByUser,
  listTodosRegistros,
} from "../../src/lib/db.server";
import { nomeVirtude } from "../../src/lib/virtues-list";
import { escapeCsv } from "../../src/lib/csv";
import { formatarDataPtBr } from "../../src/lib/format";
import { createTestDb, closeTestDb } from "../helpers/setup";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("Edge cases — empty database", () => {
  it("listRegistrosByUser returns empty array", () => {
    expect(listRegistrosByUser("any-user", db)).toEqual([]);
  });

  it("listTodosRegistros returns empty array", () => {
    expect(listTodosRegistros(undefined, db)).toEqual([]);
  });

  it("getRegistroById returns null", () => {
    expect(getRegistroById(999, "any-user", db)).toBeNull();
  });
});

describe("Edge cases — max-length text fields", () => {
  it("accepts valid emotion array", () => {
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: ["feliz"],
        descricao_acoes: "ok",
      },
      db,
    );
    expect(created.emocao_atual).toBe('["feliz"]');
  });

  it("accepts sintomas_atuais at exactly 2000 chars", () => {
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        sintomas_atuais: "b".repeat(2000),
        descricao_acoes: "ok",
      },
      db,
    );
    expect(created.sintomas_atuais).toHaveLength(2000);
  });

  it("accepts descricao_acoes at exactly 5000 chars", () => {
    const long = "c".repeat(5000);
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: long,
      },
      db,
    );
    expect(created.descricao_acoes).toHaveLength(5000);
  });
});

describe("Edge cases — unicode and special characters", () => {
  it("accepts unicode in emocao_atual", () => {
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: ["feliz 😊"],
        sintomas_atuais: "nenhum 🎉",
        descricao_acoes: "Pratiquei paciência 🧘 e gratidão 🙏",
      },
      db,
    );
    expect(created.emocao_atual).toBe('["feliz 😊"]');
    expect(created.sintomas_atuais).toBe("nenhum 🎉");
    expect(created.descricao_acoes).toContain("🧘");
  });

  it("accepts accented chars in emocao_atual", () => {
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "paciencia",
        modalidade: "individual",
        emocao_atual: ["nostalgico"],
        sintomas_atuais: "cabeça",
        descricao_acoes: "Pratiquei paciência no trânsito lento.",
      },
      db,
    );
    expect(created.emocao_atual).toContain("nostalgico");
    expect(created.sintomas_atuais).toContain("ç");
    expect(created.descricao_acoes).toContain("ê");
  });

  it("handles newlines in text fields", () => {
    const multiline = "Linha 1\nLinha 2\r\nLinha 3";
    const created = createRegistro(
      {
        user_id: "u1",
        data_registro: "2026-08-26",
        virtude: "fe",
        modalidade: "individual",
        emocao_atual: '["ok"]',
        descricao_acoes: multiline,
      },
      db,
    );
    expect(created.descricao_acoes).toBe(multiline);
  });

  it("CSV escapes newlines correctly", () => {
    const val = "line1\nline2";
    expect(escapeCsv(val)).toBe('"line1\nline2"');
  });

  it("CSV escapes semicolons correctly", () => {
    expect(escapeCsv("a;b")).toBe('"a;b"');
  });

  it("CSV escapes double quotes correctly", () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("Edge cases — nomeVirtude with special characters", () => {
  it("returns correct name for accented slugs", () => {
    expect(nomeVirtude("paciencia")).toBe("Paciência");
    expect(nomeVirtude("fe")).toBe("Fé");
    expect(nomeVirtude("gratidao")).toBe("Gratidão");
    expect(nomeVirtude("humildade")).toBe("Humildade");
    expect(nomeVirtude("nao-julgamento")).toBe("Não Julgamento");
    expect(nomeVirtude("pureza-de-coracao")).toBe("Pureza de Coração");
  });

  it("returns slug itself for unknown virtue", () => {
    expect(nomeVirtude("virtude-inexistente")).toBe("virtude-inexistente");
  });
});

describe("Edge cases — formatarDataPtBr", () => {
  it("formats standard ISO date", () => {
    expect(formatarDataPtBr("2026-01-15")).toBe("15/01/2026");
  });

  it("handles leap year date", () => {
    expect(formatarDataPtBr("2024-02-29")).toBe("29/02/2024");
  });

  it("returns empty for empty string", () => {
    expect(formatarDataPtBr("")).toBe("");
  });

  it("returns original for non-ISO format", () => {
    expect(formatarDataPtBr("15/01/2026")).toBe("15/01/2026");
  });
});

describe("Edge cases — record count at scale", () => {
  it("handles creating and listing 100 records", () => {
    for (let i = 0; i < 100; i++) {
      createRegistro(
        {
          user_id: "bulk-user",
          data_registro: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
          virtude: "fe",
          modalidade: "individual",
          emocao_atual: '["ok"]',
          descricao_acoes: `Record ${i}`,
        },
        db,
      );
    }

    const all = listRegistrosByUser("bulk-user", db);
    expect(all).toHaveLength(100);

    const filtered = listTodosRegistros({ de: "2026-08-10", ate: "2026-08-15" }, db);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(100);
  });
});
