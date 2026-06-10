// __tests__/safe-redirect.test.ts
// Test per la protezione open-redirect: un parametro `next` controllato
// dall'utente non deve mai poter reindirizzare verso un dominio esterno.

import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("accetta un path relativo semplice", () => {
    expect(safeNextPath("/app")).toBe("/app");
  });

  it("accetta un path relativo con segmenti", () => {
    expect(safeNextPath("/join/abc123")).toBe("/join/abc123");
  });

  it("usa il fallback per null/undefined/vuoto", () => {
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath(undefined)).toBe("/app");
    expect(safeNextPath("")).toBe("/app");
  });

  it("blocca URL assoluti http/https (open redirect)", () => {
    expect(safeNextPath("https://evil.com")).toBe("/app");
    expect(safeNextPath("http://evil.com/phish")).toBe("/app");
  });

  it("blocca URL protocol-relative //evil.com", () => {
    expect(safeNextPath("//evil.com")).toBe("/app");
  });

  it("blocca backslash usati per bypassare (/\\evil.com)", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/app");
    expect(safeNextPath("\\/evil.com")).toBe("/app");
  });

  it("blocca path che non iniziano con /", () => {
    expect(safeNextPath("app")).toBe("/app");
    expect(safeNextPath("javascript:alert(1)")).toBe("/app");
  });

  it("accetta un fallback personalizzato", () => {
    expect(safeNextPath(null, "/login")).toBe("/login");
    expect(safeNextPath("https://evil.com", "/login")).toBe("/login");
  });
});
