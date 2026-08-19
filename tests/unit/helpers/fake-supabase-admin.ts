// Minimal, hand-rolled stand-in for the Supabase admin (service-role) client
// returned by src/lib/supabase/admin.ts's createAdminClient(). Mimics just
// enough of supabase-js's PromiseLike query-builder chain — every chain
// method (select/gte/lt/limit/delete/...) returns the same builder, and
// awaiting the chain resolves a canned, per-table result — to unit-test code
// that reads/writes public.* tables without a live database.
//
// Used by tests/unit/alerts/digest.test.ts and
// tests/unit/api/admin-stats-route.test.ts (both mock @/lib/supabase/admin
// wholesale and hand this fake back from createAdminClient()).

export interface FakeQueryResult {
  data?: unknown[] | null;
  count?: number | null;
  error?: { code?: string; message?: string } | null;
}

export interface RecordedChainCall {
  method: string;
  args: unknown[];
}

export interface FakeAdminCall {
  table: string;
  chain: RecordedChainCall[];
}

export interface FakeRpcCall {
  name: string;
  args: unknown;
}

export interface FakeAdminOptions {
  /** Result returned for `.from(table)...`, keyed by table name. A table not
   *  listed here falls back to `defaultTableResult`. */
  tables?: Record<string, FakeQueryResult>;
  /** Result returned for `.rpc(name, args)`, keyed by rpc name. An rpc not
   *  listed here falls back to `defaultRpcResult`. */
  rpcs?: Record<string, FakeQueryResult>;
  defaultTableResult?: FakeQueryResult;
  defaultRpcResult?: FakeQueryResult;
}

const CHAIN_METHODS = [
  "select",
  "gte",
  "lt",
  "gt",
  "lte",
  "limit",
  "delete",
  "order",
  "eq",
] as const;

function makeThenable(result: FakeQueryResult, chain: RecordedChainCall[]) {
  const builder: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = (...args: unknown[]) => {
      chain.push({ method, args });
      return builder;
    };
  }
  // Makes `await admin.from(table).select(...).gte(...)` resolve `result`,
  // exactly like a real supabase-js query builder.
  builder.then = (
    resolve: (value: FakeQueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

export function createFakeAdmin(opts: FakeAdminOptions = {}) {
  const tableCalls: FakeAdminCall[] = [];
  const rpcCalls: FakeRpcCall[] = [];
  const defaultTableResult: FakeQueryResult = opts.defaultTableResult ?? {
    data: [],
    count: 0,
    error: null,
  };
  const defaultRpcResult: FakeQueryResult = opts.defaultRpcResult ?? {
    data: [],
    error: null,
  };

  const admin = {
    from(table: string) {
      const chain: RecordedChainCall[] = [];
      tableCalls.push({ table, chain });
      const result = opts.tables?.[table] ?? defaultTableResult;
      return makeThenable(result, chain);
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      const result = opts.rpcs?.[name] ?? defaultRpcResult;
      return makeThenable(result, []);
    },
  };

  return { admin, tableCalls, rpcCalls };
}
