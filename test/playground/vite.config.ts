import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Serves the playground at http://localhost:8080 against the package source.
// public/checksso.html is served from the package's own public dir.
export default defineConfig({
  root: r("."),
  publicDir: r("../../public"),
  resolve: { alias: { "mydigitalid-sso": r("../../src/index.ts") } },
  server: { port: 8080, strictPort: true },
});
