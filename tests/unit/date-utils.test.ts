import { describe, it, expect } from "vitest";
import { formatarDataPtBr, truncarTexto, truncarUserId } from "../../src/lib/format";
import { agoraLocal, hojeLocal, paraInputDatetimeLocal } from "../../src/lib/date";

describe("formatarDataPtBr", () => {
  it("converts ISO date to DD/MM/YYYY", () => {
    expect(formatarDataPtBr("2026-08-26")).toBe("26/08/2026");
  });

  it("converts datetime (YYYY-MM-DDTHH:mm) to DD/MM/YYYY HH:mm", () => {
    expect(formatarDataPtBr("2026-08-26T14:30")).toBe("26/08/2026 14:30");
  });

  it("converts datetime with seconds and ISO format to DD/MM/YYYY HH:mm", () => {
    expect(formatarDataPtBr("2026-08-26T14:30:00")).toBe("26/08/2026 14:30");
    expect(formatarDataPtBr("2026-08-26T14:30:00.000Z")).toBe("26/08/2026 14:30");
  });

  it("converts datetime with space to DD/MM/YYYY HH:mm", () => {
    expect(formatarDataPtBr("2026-08-26 14:30")).toBe("26/08/2026 14:30");
  });

  it("handles first day of year", () => {
    expect(formatarDataPtBr("2026-01-01")).toBe("01/01/2026");
  });

  it("handles last day of year", () => {
    expect(formatarDataPtBr("2026-12-31")).toBe("31/12/2026");
  });

  it("returns empty string for empty input", () => {
    expect(formatarDataPtBr("")).toBe("");
  });

  it("returns original string if not ISO format", () => {
    expect(formatarDataPtBr("26/08/2026")).toBe("26/08/2026");
  });

  it("returns original string for partial date", () => {
    expect(formatarDataPtBr("2026-08")).toBe("2026-08");
  });
});

describe("date helpers (agoraLocal, hojeLocal, paraInputDatetimeLocal)", () => {
  it("hojeLocal returns YYYY-MM-DD format", () => {
    const hoje = hojeLocal();
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("agoraLocal returns YYYY-MM-DDTHH:mm format", () => {
    const agora = agoraLocal();
    expect(agora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("paraInputDatetimeLocal converts date-only to YYYY-MM-DDTHH:mm", () => {
    expect(paraInputDatetimeLocal("2026-08-26")).toBe("2026-08-26T00:00");
  });

  it("paraInputDatetimeLocal keeps datetime intact in YYYY-MM-DDTHH:mm", () => {
    expect(paraInputDatetimeLocal("2026-08-26T14:30")).toBe("2026-08-26T14:30");
    expect(paraInputDatetimeLocal("2026-08-26T14:30:45")).toBe("2026-08-26T14:30");
  });

  it("paraInputDatetimeLocal falls back to agoraLocal for empty/null input", () => {
    expect(paraInputDatetimeLocal(null)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(paraInputDatetimeLocal("")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("truncarTexto", () => {
  it("returns full text when under limit", () => {
    expect(truncarTexto("hello", 10)).toBe("hello");
  });

  it("returns full text at exact limit", () => {
    expect(truncarTexto("hello", 5)).toBe("hello");
  });

  it("truncates text over limit with ellipsis", () => {
    expect(truncarTexto("hello world", 5)).toBe("hello...");
  });

  it("returns empty string for empty input", () => {
    expect(truncarTexto("", 10)).toBe("");
  });

  it("returns empty string for falsy input", () => {
    expect(truncarTexto("" as string, 10)).toBe("");
  });

  it("handles single character limit", () => {
    expect(truncarTexto("hello", 1)).toBe("h...");
  });
});

describe("truncarUserId", () => {
  it("returns full userId when 8 chars or less", () => {
    expect(truncarUserId("abc12345")).toBe("abc12345");
  });

  it("truncates userId longer than 8 chars", () => {
    expect(truncarUserId("abc123456789")).toBe("abc12345...");
  });

  it("returns empty string for empty input", () => {
    expect(truncarUserId("")).toBe("");
  });

  it("handles exactly 7 chars", () => {
    expect(truncarUserId("1234567")).toBe("1234567");
  });

  it("handles 9 chars", () => {
    expect(truncarUserId("123456789")).toBe("12345678...");
  });
});
