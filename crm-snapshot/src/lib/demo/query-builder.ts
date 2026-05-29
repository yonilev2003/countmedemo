// Minimal Supabase-compatible query builder backed by demoStore.
// Supports the methods our app actually calls.

import { demoStore } from "./store";
import { FK_RELATIONS } from "./seed";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

interface SelectPart {
  /** Alias or column name on output. For joins this is the relation key. */
  outKey: string;
  /** Plain column name on source row (for non-joins). */
  sourceCol?: string;
  /** Join target table (resolved via FK_RELATIONS or guessed). */
  joinTable?: string;
  /** Sub-select string for the joined table. */
  joinSelect?: string;
}

function parseSelect(raw: string): { all: boolean; parts: SelectPart[] } {
  const parts: SelectPart[] = [];
  let all = false;

  // Top-level split by commas, but ignoring commas inside parentheses
  const tokens: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of raw) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      tokens.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) tokens.push(cur.trim());

  for (const tok of tokens) {
    if (tok === "*") {
      all = true;
      continue;
    }

    // Join syntax: "alias:table(sub)" or "alias:table!fk(sub)" or "alias:table!inner(sub)"
    const joinMatch = tok.match(/^([\w]+):([\w]+)(!\w+)?(?:\(([^)]*)\))?$/);
    if (joinMatch) {
      const [, alias, table, , subSel] = joinMatch;
      parts.push({ outKey: alias, joinTable: table, joinSelect: subSel || "*" });
      continue;
    }

    // Alternative form: just "table(sub)" - relation name == table name
    const tableMatch = tok.match(/^([\w]+)(!\w+)?\(([^)]*)\)$/);
    if (tableMatch) {
      const [, table, , subSel] = tableMatch;
      parts.push({ outKey: table, joinTable: table, joinSelect: subSel || "*" });
      continue;
    }

    // Plain column
    parts.push({ outKey: tok, sourceCol: tok });
  }

  return { all, parts };
}

function getValue(row: Row, path: string): unknown {
  return row[path];
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function applyJoins(row: Row, fromTable: string, parts: SelectPart[]): Row {
  const out: Row = { ...row };
  const rels = FK_RELATIONS[fromTable] ?? {};

  for (const p of parts) {
    if (!p.joinTable) continue;
    const rel = rels[p.outKey];

    // Determine the join column. If FK_RELATIONS doesn't have it,
    // try guessing: same as outKey + "_id" or table + "_id"
    let sourceCol: string | undefined;
    let targetTable: string;
    if (rel) {
      sourceCol = rel.col;
      targetTable = rel.table;
    } else {
      targetTable = p.joinTable;
      // Heuristics: `${outKey}_id` or `${joinTable.replace(/s$/,'')}_id`
      const candidates = [`${p.outKey}_id`, `${p.joinTable}_id`, `${p.joinTable.replace(/s$/, "")}_id`];
      sourceCol = candidates.find((c) => c in row);
    }

    if (!sourceCol) {
      // Reverse-relation? E.g., contact has many activities. Skip for now.
      out[p.outKey] = [];
      continue;
    }

    const refValue = row[sourceCol];
    if (refValue == null) {
      out[p.outKey] = null;
      continue;
    }

    const targetRows = demoStore.table(targetTable);
    const match = targetRows.find((r) => r.id === refValue);
    out[p.outKey] = match ? applyJoins(match, targetTable, parseSelect(p.joinSelect ?? "*").parts) : null;
  }

  return out;
}

function projectColumns(row: Row, selectAll: boolean, parts: SelectPart[]): Row {
  if (selectAll && parts.every((p) => p.joinTable)) {
    // "*" + joins → keep all source + add joins
    const out: Row = { ...row };
    for (const p of parts) {
      if (p.joinTable && p.outKey in row) {
        // No-op, applyJoins already wrote it
      }
      if (p.joinTable) {
        out[p.outKey] = row[p.outKey];
      }
    }
    return out;
  }

  const out: Row = {};
  if (selectAll) Object.assign(out, row);
  for (const p of parts) {
    if (p.sourceCol) out[p.outKey] = row[p.sourceCol];
    else if (p.joinTable) out[p.outKey] = row[p.outKey];
  }
  return out;
}

interface QueryResult {
  data: Row | Row[] | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

type Action = "select" | "insert" | "update" | "delete" | "upsert";

export class DemoQueryBuilder implements PromiseLike<QueryResult> {
  private action: Action = "select";
  private selectRaw = "*";
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private wantCount = false;
  private countOnly = false;

  // Mutation payloads
  private insertRows: Row[] = [];
  private updatePatch: Row = {};
  private upsertRow: Row | null = null;
  private upsertOnConflict: string | null = null;

  constructor(private readonly table: string) {}

  // ─── SELECT / mutations ──────────────────────────────────────────────
  select(cols: string = "*", opts?: { count?: "exact"; head?: boolean }): DemoQueryBuilder {
    this.selectRaw = cols || "*";
    if (opts?.count === "exact") this.wantCount = true;
    if (opts?.head) this.countOnly = true;
    return this;
  }

  insert(rows: Row | Row[]): DemoQueryBuilder {
    this.action = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Row): DemoQueryBuilder {
    this.action = "update";
    this.updatePatch = patch;
    return this;
  }

  delete(opts?: { count?: "exact" }): DemoQueryBuilder {
    this.action = "delete";
    if (opts?.count === "exact") this.wantCount = true;
    return this;
  }

  upsert(row: Row, opts?: { onConflict?: string }): DemoQueryBuilder {
    this.action = "upsert";
    this.upsertRow = row;
    this.upsertOnConflict = opts?.onConflict ?? null;
    return this;
  }

  // ─── Filters ─────────────────────────────────────────────────────────
  /**
   * Resolves a (possibly dotted) column path against a row, following
   * one level of foreign-key relations registered in FK_RELATIONS.
   * `eq("project.workspace_id", id)` → tasks.project_id → projects, read workspace_id.
   */
  private resolveDotted(row: Row, path: string): unknown {
    if (!path.includes(".")) return row[path];
    const [relation, ...rest] = path.split(".");
    const rel = FK_RELATIONS[this.table]?.[relation];
    if (!rel) return undefined;
    const refId = row[rel.col];
    if (refId == null) return undefined;
    const target = demoStore.table(rel.table).find((r) => r.id === refId);
    if (!target) return undefined;
    return rest.length === 1 ? target[rest[0]] : undefined;
  }

  eq(col: string, val: unknown): DemoQueryBuilder {
    if (col.includes(".")) {
      this.filters.push((r) => this.resolveDotted(r, col) === val);
    } else {
      this.filters.push((r) => r[col] === val);
    }
    return this;
  }
  neq(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => r[col] !== val); return this; }
  in(col: string, arr: unknown[]): DemoQueryBuilder { this.filters.push((r) => arr.includes(r[col])); return this; }
  is(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => (val == null ? r[col] == null : r[col] === val)); return this; }
  gt(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => compareValues(r[col], val) > 0); return this; }
  gte(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => compareValues(r[col], val) >= 0); return this; }
  lt(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => compareValues(r[col], val) < 0); return this; }
  lte(col: string, val: unknown): DemoQueryBuilder { this.filters.push((r) => compareValues(r[col], val) <= 0); return this; }
  not(col: string, op: string, val: unknown): DemoQueryBuilder {
    if (op === "is") this.filters.push((r) => !(val == null ? r[col] == null : r[col] === val));
    else this.filters.push((r) => r[col] !== val);
    return this;
  }
  contains(col: string, arr: unknown[]): DemoQueryBuilder {
    this.filters.push((r) => {
      const v = r[col];
      if (!Array.isArray(v)) return false;
      return arr.every((x) => v.includes(x));
    });
    return this;
  }
  or(filterStr: string): DemoQueryBuilder {
    // Parse "name.ilike.%foo%,company.ilike.%foo%"
    const clauses = filterStr.split(",").map((c) => c.trim()).filter(Boolean);
    const predicates: Filter[] = clauses.map((c) => {
      const m = c.match(/^([\w]+)\.([\w]+)\.(.+)$/);
      if (!m) return () => true;
      const [, col, op, raw] = m;
      const val = raw.replace(/^%|%$/g, "");
      if (op === "ilike") return (r) => String(r[col] ?? "").toLowerCase().includes(val.toLowerCase());
      if (op === "eq") return (r) => r[col] === raw;
      return () => true;
    });
    this.filters.push((r) => predicates.some((p) => p(r)));
    return this;
  }

  // ─── Modifiers ───────────────────────────────────────────────────────
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): DemoQueryBuilder {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number): DemoQueryBuilder { this.limitN = n; return this; }
  single(): DemoQueryBuilder { this.isSingle = true; return this; }
  maybeSingle(): DemoQueryBuilder { this.isMaybeSingle = true; return this; }

  // ─── Execute ─────────────────────────────────────────────────────────
  private execute(): QueryResult {
    const rows = demoStore.table(this.table);

    if (this.action === "insert") {
      const inserted = this.insertRows.map((r) => ensureId(r));
      rows.push(...inserted);
      const data = this.isSingle ? inserted[0] ?? null : inserted;
      return { data, error: null };
    }

    if (this.action === "upsert") {
      if (!this.upsertRow) return { data: null, error: { message: "no upsert row" } };
      const conflictCols = (this.upsertOnConflict ?? "id").split(",").map((c) => c.trim());
      const existingIdx = rows.findIndex((r) =>
        conflictCols.every((c) => r[c] === this.upsertRow![c]),
      );
      if (existingIdx >= 0) {
        rows[existingIdx] = { ...rows[existingIdx], ...this.upsertRow };
        return { data: rows[existingIdx], error: null };
      }
      const inserted = ensureId(this.upsertRow);
      rows.push(inserted);
      return { data: inserted, error: null };
    }

    if (this.action === "update") {
      let updated: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (this.filters.every((f) => f(rows[i]))) {
          rows[i] = { ...rows[i], ...this.updatePatch, updated_at: new Date().toISOString() };
          updated.push(rows[i]);
        }
      }
      const data = this.isSingle ? updated[0] ?? null : updated;
      return { data, error: null };
    }

    if (this.action === "delete") {
      let count = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (this.filters.every((f) => f(rows[i]))) {
          rows.splice(i, 1);
          count++;
        }
      }
      return { data: null, error: null, count: this.wantCount ? count : undefined };
    }

    // SELECT path
    let result = rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      result = [...result].sort((a, b) => compareValues(a[col], b[col]) * (asc ? 1 : -1));
    }

    const totalCount = result.length;

    if (this.limitN != null) result = result.slice(0, this.limitN);

    if (this.countOnly) {
      return { data: null, error: null, count: totalCount };
    }

    const { all, parts } = parseSelect(this.selectRaw);
    const projected = result.map((r) => {
      const withJoins = applyJoins(r, this.table, parts);
      return projectColumns(withJoins, all, parts);
    });

    if (this.isSingle) {
      if (projected.length === 0) {
        return { data: null, error: { message: "no rows", code: "PGRST116" } };
      }
      return { data: projected[0], error: null, count: this.wantCount ? totalCount : undefined };
    }
    if (this.isMaybeSingle) {
      return { data: projected[0] ?? null, error: null };
    }
    return { data: projected, error: null, count: this.wantCount ? totalCount : undefined };
  }

  // Make it thenable
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

function ensureId(row: Row): Row {
  if (row.id) return { ...row, created_at: row.created_at ?? new Date().toISOString(), updated_at: row.updated_at ?? new Date().toISOString() };
  return {
    ...row,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
