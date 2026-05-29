// In-memory store for demo mode. Lives on globalThis so it survives
// Next.js hot reloads in dev. Resets on Node restart.

import { buildSeed } from "./seed";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const KEY = "__countme_crm_demo_store__";

function getOrInitTables(): Tables {
  const g = globalThis as unknown as Record<string, Tables>;
  if (!g[KEY]) {
    g[KEY] = buildSeed();
  }
  return g[KEY];
}

export const demoStore = {
  get all() {
    return getOrInitTables();
  },
  table(name: string): Row[] {
    const t = getOrInitTables();
    if (!t[name]) t[name] = [];
    return t[name];
  },
  reset() {
    const g = globalThis as unknown as Record<string, Tables | undefined>;
    g[KEY] = undefined;
  },
};
