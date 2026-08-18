// Vitest stand-in for the "server-only" package.
//
// "server-only" isn't in node_modules at all — Next.js resolves it via a
// built-in webpack shim (see AGENTS.md: "this version has breaking changes
// vs. your training data"), so `import "server-only"` only works inside
// Next's own build/dev server, never under plain Node/Vite. Every real admin
// (service-role) module — src/lib/supabase/admin.ts — starts with that
// import as a defence-in-depth guard against a client bundle accidentally
// pulling in the service-role key; it's a no-op everywhere that isn't a
// browser bundle, which a Vitest run under Node always is not. This shim
// (aliased in vitest.config.ts) makes that import resolve to nothing, so
// server-only modules become importable from unit/integration tests without
// weakening the guard Next actually enforces at build time.
export {};
