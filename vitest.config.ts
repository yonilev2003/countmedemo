import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit/golden tests only — Playwright owns tests/e2e (run via test:e2e).
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" is a Next.js built-in webpack shim, not an npm package
      // (see tests/unit/helpers/server-only-shim.ts) — alias it so modules
      // that import it (src/lib/supabase/admin.ts and anything downstream,
      // e.g. lib/agent/tools.ts's knowledge tools) resolve under Vitest too.
      "server-only": path.resolve(__dirname, "tests/unit/helpers/server-only-shim.ts"),
    },
  },
});
