import { describe, it, expect, afterEach } from "vitest";
import { isAdminEmail } from "../../src/lib/admin-email";

describe("isAdminEmail", () => {
  const ORIGINAL = process.env.VITE_INITIAL_ADMIN_EMAIL;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.VITE_INITIAL_ADMIN_EMAIL;
    } else {
      process.env.VITE_INITIAL_ADMIN_EMAIL = ORIGINAL;
    }
  });

  it("returns true for default admin email", () => {
    delete process.env.VITE_INITIAL_ADMIN_EMAIL;
    expect(isAdminEmail("rlpeixoto@gmail.com")).toBe(true);
  });

  it("returns true case-insensitive", () => {
    delete process.env.VITE_INITIAL_ADMIN_EMAIL;
    expect(isAdminEmail("RLPEIXOTO@GMAIL.COM")).toBe(true);
  });

  it("returns false for non-admin email", () => {
    delete process.env.VITE_INITIAL_ADMIN_EMAIL;
    expect(isAdminEmail("other@example.com")).toBe(false);
  });

  it("returns false for undefined email", () => {
    delete process.env.VITE_INITIAL_ADMIN_EMAIL;
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("respects custom env override", () => {
    process.env.VITE_INITIAL_ADMIN_EMAIL = "custom@admin.com";
    expect(isAdminEmail("custom@admin.com")).toBe(true);
    expect(isAdminEmail("rlpeixoto@gmail.com")).toBe(false);
  });
});
