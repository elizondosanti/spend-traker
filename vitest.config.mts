import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    environment: "node",
    env: { PGLITE_DIR: "memory" },
    testTimeout: 30000,
  },
});
