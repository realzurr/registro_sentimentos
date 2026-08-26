import {
  createRegistro,
  getDb,
  listRegistrosByUser,
  listTodosRegistros,
  updateRegistro,
  deleteRegistro,
} from "../src/lib/db.server";
import { unlinkSync } from "node:fs";

const DB = process.cwd() + "/virtudes.db";
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    unlinkSync(DB + suffix);
  } catch {
    /* arquivo pode não existir */
  }
}

const conn = getDb();
const tabelas = conn
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  .all();
console.log("TABELAS:", JSON.stringify(tabelas));

const r1 = createRegistro({
  user_id: "user-a",
  data_registro: "2026-08-26",
  virtude: "paciencia",
  modalidade: "grupo",
  emocao_atual: "tranquilo",
  sintomas_atuais: null,
  descricao_acoes: "Pratiquei paciência na reunião do grupo.",
});
const r2 = createRegistro({
  user_id: "user-b",
  data_registro: "2026-08-25",
  virtude: "gratidao",
  modalidade: "individual",
  emocao_atual: "grato",
  descricao_acoes: "Diário de gratidão.",
});

const falhouCheck = (() => {
  try {
    createRegistro({
      user_id: "user-a",
      data_registro: "2026-08-26",
      virtude: "fe",
      modalidade: "sozinho" as never,
      emocao_atual: "x",
      descricao_acoes: "y",
    });
    return false;
  } catch {
    return true;
  }
})();
console.log("CHECK_MODALIDADE_REJEITA_INVALIDO:", falhouCheck);

console.log("ISOLAMENTO_USER_A:", listRegistrosByUser("user-a").length === 1);
console.log("ISOLAMENTO_USER_B:", listRegistrosByUser("user-b").length === 1);
console.log("ADMIN_LISTA_TODOS:", listTodosRegistros().length === 2);
console.log(
  "FILTRO_PERIODO:",
  listTodosRegistros({ de: "2026-08-26", ate: "2026-08-26" }).length === 1 &&
    listTodosRegistros({ userId: "user-b" }).length === 1,
);

console.log(
  "UPDATE_DENTRO_JANELA:",
  updateRegistro(r1.id, "user-a", { emocao_atual: "sereno" }).ok,
);
console.log(
  "UPDATE_OUTRO_USUARIO_NEGADO:",
  !updateRegistro(r1.id, "user-b", { emocao_atual: "hack" }).ok,
);

getDb().exec(
  `UPDATE registros_virtudes SET criado_em = '2026-08-20T10:00:00Z', atualizado_em = NULL WHERE id = ${r1.id}`,
);
const fora = updateRegistro(r1.id, "user-a", { emocao_atual: "tarde" });
console.log("UPDATE_FORA_JANELA_NEGADO:", !fora.ok, "| msg:", fora.erro);
console.log("DELETE_FORA_JANELA_NEGADO:", !deleteRegistro(r1.id, "user-a").ok);
console.log("DELETE_DENTRO_JANELA:", deleteRegistro(r2.id, "user-b").ok);
