import { describe, it, expect } from "vitest";
import { escapeCsv, buildCsvLinhas } from "../../src/lib/csv";

describe("escapeCsv", () => {
  it("returns empty string for null", () => {
    expect(escapeCsv(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCsv(undefined)).toBe("");
  });

  it("returns the string as-is when no special characters", () => {
    expect(escapeCsv("hello")).toBe("hello");
    expect(escapeCsv(123)).toBe("123");
    expect(escapeCsv(true)).toBe("true");
  });

  it("wraps in quotes when value contains semicolon", () => {
    expect(escapeCsv("a;b")).toBe('"a;b"');
  });

  it("wraps in quotes when value contains comma", () => {
    expect(escapeCsv("a,b")).toBe('"a,b"');
  });

  it("wraps in quotes when value contains double quote", () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps in quotes when value contains newline", () => {
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps in quotes when value contains carriage return", () => {
    expect(escapeCsv("line1\rline2")).toBe('"line1\rline2"');
  });

  it("escapes multiple double quotes", () => {
    expect(escapeCsv('a"b"c')).toBe('"a""b""c"');
  });

  it("handles empty string", () => {
    expect(escapeCsv("")).toBe("");
  });

  it("handles number zero", () => {
    expect(escapeCsv(0)).toBe("0");
  });
});

describe("buildCsvLinhas", () => {
  it("builds rows from records", () => {
    const records = [
      { id: 1, nome: "Alice" },
      { id: 2, nome: "Bob" },
    ];
    const result = buildCsvLinhas(records, ["id", "nome"]);
    expect(result).toEqual(["1;Alice", "2;Bob"]);
  });

  it("escapes values with semicolons", () => {
    const records = [{ id: 1, nome: "A;B" }];
    const result = buildCsvLinhas(records, ["id", "nome"]);
    expect(result).toEqual(['1;"A;B"']);
  });

  it("uses custom separator", () => {
    const records = [{ id: 1, nome: "Alice" }];
    const result = buildCsvLinhas(records, ["id", "nome"], ",");
    expect(result).toEqual(["1,Alice"]);
  });

  it("returns empty array for empty records", () => {
    const result = buildCsvLinhas([], ["id", "nome"]);
    expect(result).toEqual([]);
  });

  it("handles null values in records", () => {
    const records = [{ id: 1, nome: null }];
    const result = buildCsvLinhas(records, ["id", "nome"]);
    expect(result).toEqual(["1;"]);
  });
});
