// vitest.config.ts
// Configurazione Vitest per il frontend TripVote.
// Usa happy-dom come ambiente DOM leggero (alternativa a jsdom), globals:true
// per evitare di importare describe/it/expect in ogni test file.
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // happy-dom è più veloce di jsdom e sufficiente per unit test puri
    environment: "happy-dom",
    // Espone describe, it, expect, vi globalmente senza import espliciti
    globals: true,
  },
  resolve: {
    alias: {
      // Mappa "@/" al root del progetto, coerente con tsconfig paths
      "@": path.resolve(__dirname, "."),
    },
  },
});
