import { describe, it, expect } from "vitest";
import { registroSchema } from "../../src/lib/api/registros.server";

const validInput = {
  data_registro: "2026-08-26",
  virtude: "paciencia",
  modalidade: "individual" as const,
  emocao_atual: ["feliz"],
  descricao_acoes: "Pratiquei paciencia hoje",
};

describe("registroSchema", () => {
  it("accepts valid input with date only", () => {
    const result = registroSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with datetime (YYYY-MM-DDTHH:mm)", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      data_registro: "2026-08-26T14:30",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with full ISO datetime", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      data_registro: "2026-08-26T14:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with sintomas_atuais", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      sintomas_atuais: ["dorcabeca"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with null sintomas_atuais", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      sintomas_atuais: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts input without sintomas_atuais", () => {
    const { sintomas_atuais: _, ...rest } = validInput;
    const result = registroSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects empty data_registro", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      data_registro: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format (DD-MM-YYYY)", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      data_registro: "26-08-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format (YYYY/MM/DD)", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      data_registro: "2026/08/26",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty virtude", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      virtude: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid modalidade", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      modalidade: "online",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty emocao_atual", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      emocao_atual: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emotion slug", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      emocao_atual: ["invalido"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid emotion array", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      emocao_atual: ["feliz", "tranquilo"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty descricao_acoes", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      descricao_acoes: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects descricao_acoes over 5000 chars", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      descricao_acoes: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sintoma slug", () => {
    const result = registroSchema.safeParse({
      ...validInput,
      sintomas_atuais: ["invalido"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = registroSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("produces correct error messages", () => {
    const result = registroSchema.safeParse({
      data_registro: "invalid",
      virtude: "",
      modalidade: "wrong",
      emocao_atual: [],
      descricao_acoes: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Data inválida.");
      expect(messages).toContain("Informe a virtude trabalhada.");
      expect(messages).toContain("Informe se a prática foi em grupo ou individual.");
      expect(messages).toContain("Selecione pelo menos uma emoção.");
      expect(messages).toContain("Descreva as ações realizadas.");
    }
  });
});
