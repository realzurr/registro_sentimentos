import type { NovoRegistro } from "../../src/lib/db.server";

let nextId = 1;

export function createSampleRegistro(overrides?: Partial<NovoRegistro>): NovoRegistro {
  const id = nextId++;
  return {
    user_id: `test-user-${id}`,
    data_registro: "2026-08-26",
    virtude: "paciencia",
    modalidade: "individual",
    emocao_atual: '["tranquilo"]',
    sintomas_atuais: null,
    descricao_acoes: "Pratiquei paciencia durante o transito.",
    ...overrides,
  };
}

export function resetFixtures(): void {
  nextId = 1;
}
