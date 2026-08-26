import { describe, it, expect } from "vitest";
import { nomeVirtude, virtudes } from "../../src/lib/virtues-list";

describe("virtudes-list", () => {
  it("contains 32 virtues", () => {
    expect(virtudes).toHaveLength(32);
  });

  it("each virtue has slug and nome", () => {
    for (const v of virtudes) {
      expect(v.slug).toBeTruthy();
      expect(v.nome).toBeTruthy();
    }
  });

  it("nomeVirtude returns display name for valid slug", () => {
    expect(nomeVirtude("paciencia")).toBe("Paciência");
    expect(nomeVirtude("humildade")).toBe("Humildade");
    expect(nomeVirtude("fe")).toBe("Fé");
  });

  it("nomeVirtude returns slug itself for unknown slug", () => {
    expect(nomeVirtude("nonexistent")).toBe("nonexistent");
  });
});
