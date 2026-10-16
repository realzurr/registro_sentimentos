import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { JANELA_EDICAO_MS } from "./constants";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), "virtudes.db");
    const dir = path.dirname(dbPath);
    if (dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    initDb(dbInstance);
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function initDb(conn: DatabaseSync) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS registros_virtudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_name TEXT,
      user_email TEXT,
      data_registro TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT,
      virtude TEXT NOT NULL,
      modalidade TEXT NOT NULL CHECK (modalidade IN ('grupo', 'individual')),
      emocao_atual TEXT NOT NULL,
      sintomas_atuais TEXT,
      descricao_acoes TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_registros_user ON registros_virtudes(user_id);
    CREATE INDEX IF NOT EXISTS idx_registros_data ON registros_virtudes(data_registro);

    CREATE TABLE IF NOT EXISTS papeis (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
    );
  `);

  const cols = conn.prepare(`PRAGMA table_info(registros_virtudes)`).all() as {
    name: string;
  }[];
  const names = new Set(cols.map((c) => c.name));
  for (const col of [
    ["user_name", "TEXT"],
    ["user_email", "TEXT"],
  ] as const) {
    if (!names.has(col[0])) {
      conn.exec(`ALTER TABLE registros_virtudes ADD COLUMN ${col[0]} ${col[1]}`);
    }
  }
}

export interface RegistroVirtude {
  id: number;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  data_registro: string;
  criado_em: string;
  atualizado_em: string | null;
  virtude: string;
  modalidade: "grupo" | "individual";
  emocao_atual: string;
  sintomas_atuais: string | null;
  descricao_acoes: string;
}

export interface NovoRegistro {
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  data_registro: string;
  virtude: string;
  modalidade: "grupo" | "individual";
  emocao_atual: string | string[];
  sintomas_atuais?: string | string[] | null;
  descricao_acoes: string;
}

export function podeModificar(registro: RegistroVirtude): boolean {
  const base = registro.atualizado_em ?? registro.criado_em;
  return Date.now() - Date.parse(base) <= JANELA_EDICAO_MS;
}

import { parseEmocoes, parseSintomas, toOptionalJson } from "./parse-utils";
export { parseEmocoes, parseSintomas, toOptionalJson };

export function createRegistro(dados: NovoRegistro, conn?: DatabaseSync): RegistroVirtude {
  const c = conn ?? getDb();
  const criadoEm = new Date().toISOString();
  const emocaoJson = Array.isArray(dados.emocao_atual)
    ? JSON.stringify(dados.emocao_atual)
    : dados.emocao_atual;
  const sintomasJson = toOptionalJson(dados.sintomas_atuais);
  const result = c
    .prepare(
      `INSERT INTO registros_virtudes
        (user_id, user_name, user_email, data_registro, criado_em, virtude, modalidade, emocao_atual, sintomas_atuais, descricao_acoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      dados.user_id,
      dados.user_name ?? null,
      dados.user_email ?? null,
      dados.data_registro,
      criadoEm,
      dados.virtude,
      dados.modalidade,
      emocaoJson,
      sintomasJson,
      dados.descricao_acoes,
    );
  const id = Number(result.lastInsertRowid);
  return getRegistroById(id, dados.user_id, c)!;
}

export function getRegistroById(
  id: number,
  userId: string,
  conn?: DatabaseSync,
): RegistroVirtude | null {
  const c = conn ?? getDb();
  return (
    (c.prepare(`SELECT * FROM registros_virtudes WHERE id = ? AND user_id = ?`).get(id, userId) as
      RegistroVirtude | undefined) ?? null
  );
}

export function listRegistrosByUser(userId: string, conn?: DatabaseSync): RegistroVirtude[] {
  const c = conn ?? getDb();
  return c
    .prepare(
      `SELECT * FROM registros_virtudes WHERE user_id = ? ORDER BY data_registro DESC, criado_em DESC`,
    )
    .all(userId) as unknown as RegistroVirtude[];
}

export function updateRegistro(
  id: number,
  userId: string,
  campos: Partial<Omit<RegistroVirtude, "emocao_atual" | "sintomas_atuais">> & {
    emocao_atual?: string | string[];
    sintomas_atuais?: string | string[] | null;
  },
  conn?: DatabaseSync,
): { ok: boolean; erro?: string } {
  const c = conn ?? getDb();
  const atual = getRegistroById(id, userId, c);
  if (!atual) return { ok: false, erro: "Registro não encontrado." };
  if (!podeModificar(atual)) {
    return { ok: false, erro: "O prazo de edição de 5 minutos já expirou para este registro." };
  }
  const emocaoVal = campos.emocao_atual
    ? Array.isArray(campos.emocao_atual)
      ? JSON.stringify(campos.emocao_atual)
      : campos.emocao_atual
    : atual.emocao_atual;
  const sintomasVal =
    campos.sintomas_atuais !== undefined
      ? toOptionalJson(campos.sintomas_atuais)
      : atual.sintomas_atuais;
  c.prepare(
    `UPDATE registros_virtudes
     SET data_registro = ?, virtude = ?, modalidade = ?, emocao_atual = ?, sintomas_atuais = ?, descricao_acoes = ?, atualizado_em = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    campos.data_registro ?? atual.data_registro,
    campos.virtude ?? atual.virtude,
    campos.modalidade ?? atual.modalidade,
    emocaoVal,
    sintomasVal,
    campos.descricao_acoes ?? atual.descricao_acoes,
    new Date().toISOString(),
    id,
    userId,
  );
  return { ok: true };
}

export function deleteRegistro(
  id: number,
  userId: string,
  conn?: DatabaseSync,
): { ok: boolean; erro?: string } {
  const c = conn ?? getDb();
  const atual = getRegistroById(id, userId, c);
  if (!atual) return { ok: false, erro: "Registro não encontrado." };
  if (!podeModificar(atual)) {
    return { ok: false, erro: "O prazo de exclusão de 5 minutos já expirou para este registro." };
  }
  c.prepare(`DELETE FROM registros_virtudes WHERE id = ? AND user_id = ?`).run(id, userId);
  return { ok: true };
}

export function listTodosRegistros(
  filtros?: { de?: string; ate?: string; userId?: string },
  conn?: DatabaseSync,
): RegistroVirtude[] {
  const c = conn ?? getDb();
  const condicoes: string[] = [];
  const params: (string | number | null)[] = [];
  if (filtros?.de) {
    condicoes.push("substr(data_registro, 1, 10) >= ?");
    params.push(filtros.de.slice(0, 10));
  }
  if (filtros?.ate) {
    condicoes.push("substr(data_registro, 1, 10) <= ?");
    params.push(filtros.ate.slice(0, 10));
  }
  if (filtros?.userId) {
    condicoes.push("user_id = ?");
    params.push(filtros.userId);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
  return c
    .prepare(
      `SELECT * FROM registros_virtudes ${where} ORDER BY data_registro DESC, criado_em DESC`,
    )
    .all(...params) as unknown as RegistroVirtude[];
}
