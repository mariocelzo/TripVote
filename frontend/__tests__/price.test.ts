// __tests__/price.test.ts
// Test TDD per la conversione prezzo euro → centesimi usata da AddProposalModal.
// L'input arriva da un campo testo: deve tollerare virgola italiana, spazi,
// simbolo €, e rifiutare input non numerici o negativi.

import { describe, it, expect } from "vitest";
import { parseEuroToCents } from "@/lib/price";

describe("parseEuroToCents", () => {
  it("converte euro interi in centesimi", () => {
    expect(parseEuroToCents("150")).toBe(15000);
  });

  it("converte decimali con punto", () => {
    expect(parseEuroToCents("89.90")).toBe(8990);
  });

  it("converte decimali con virgola italiana", () => {
    expect(parseEuroToCents("89,90")).toBe(8990);
  });

  it("arrotonda correttamente i centesimi (no errori floating point)", () => {
    // 19.99 * 100 = 1998.9999... in floating point → deve dare 1999
    expect(parseEuroToCents("19.99")).toBe(1999);
  });

  it("tollera spazi e simbolo €", () => {
    expect(parseEuroToCents(" € 45,50 ")).toBe(4550);
    expect(parseEuroToCents("45,50 €")).toBe(4550);
  });

  it("restituisce null per stringa vuota o solo spazi", () => {
    expect(parseEuroToCents("")).toBeNull();
    expect(parseEuroToCents("   ")).toBeNull();
  });

  it("restituisce null per input non numerico", () => {
    expect(parseEuroToCents("abc")).toBeNull();
    expect(parseEuroToCents("12abc")).toBeNull();
  });

  it("restituisce null per valori negativi (un prezzo non può esserlo)", () => {
    expect(parseEuroToCents("-10")).toBeNull();
  });

  it("gestisce lo zero come prezzo valido (gratis)", () => {
    expect(parseEuroToCents("0")).toBe(0);
  });
});
