import { DatabaseSync } from "node:sqlite";
import { initDb } from "../../src/lib/db.server";

export function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA journal_mode = WAL;");
  initDb(db);
  return db;
}

export function closeTestDb(db: DatabaseSync): void {
  db.close();
}
