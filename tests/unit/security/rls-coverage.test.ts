/**
 * RLS regression guard (multi-tenant safety, 2026-07-23).
 *
 * Every table in the `public` schema MUST enable Row Level Security AND declare
 * at least one policy — otherwise a single forgotten migration silently exposes
 * one user's data to another. This is the #1 way a Supabase app leaks across
 * tenants, and a "vibe-coded" migration is exactly where it slips in. This test
 * reads the migration SQL statically (no DB connection needed), so it runs in
 * plain CI and fails the build the moment a new table skips RLS.
 *
 * If a future table is INTENTIONALLY public read-only (like tax_rules/plans),
 * it still must `enable row level security` with a `for select using (true)`
 * policy — add it, don't exempt it here.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function publicTables(sql: string): string[] {
  const re = /create table (?:if not exists )?public\.(\w+)/gi;
  const names = new Set<string>();
  for (const m of sql.matchAll(re)) names.add(m[1].toLowerCase());
  return [...names];
}

/**
 * Tables that receive a policy via a `do $$ ... foreach t in array[...] ...
 * create policy %I on public.%I ... $$` loop. We collect the quoted table names
 * from any DO block that also contains `create policy`, so the coverage check
 * recognizes dynamically-created policies (not just literal ones).
 */
function loopPolicyTables(sql: string): Set<string> {
  const covered = new Set<string>();
  for (const block of sql.matchAll(/do \$\$([\s\S]*?)\$\$/gi)) {
    const body = block[1];
    if (!/create policy/i.test(body)) continue;
    for (const arr of body.matchAll(/array\[([^\]]*)\]/gi)) {
      for (const q of arr[1].matchAll(/'(\w+)'/g)) covered.add(q[1].toLowerCase());
    }
  }
  return covered;
}

describe("RLS coverage on every public table", () => {
  const sql = allMigrationSql();
  const tables = publicTables(sql);

  it("finds the known tables (sanity)", () => {
    // Guards against the regex silently matching nothing and passing vacuously.
    expect(tables.length).toBeGreaterThanOrEqual(12);
    expect(tables).toContain("profiles");
    expect(tables).toContain("invoices");
  });

  it.each(tables)("public.%s enables Row Level Security", (table) => {
    const enabled = new RegExp(
      `alter table public\\.${table}\\s+enable row level security`,
      "i",
    ).test(sql);
    expect(enabled, `Table public.${table} is missing "enable row level security"`).toBe(true);
  });

  const loopCovered = loopPolicyTables(sql);
  it.each(tables)("public.%s declares at least one policy", (table) => {
    const literal = new RegExp(
      `create policy [^;]*\\bon public\\.${table}\\b`,
      "i",
    ).test(sql);
    const hasPolicy = literal || loopCovered.has(table);
    expect(hasPolicy, `Table public.${table} has RLS but NO policy — it would deny all access, or (worse) a later grant could expose it`).toBe(true);
  });
});
