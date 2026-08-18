#!/usr/bin/env node
/**
 * Knowledge-vault indexer (RAG audit #20, 2026-08-18).
 *
 * Architecture (approved by Yoni, 18/08 — ZERO new paid vendors, Claude-only):
 * knowledge/**\/*.md is an Obsidian-compatible vault (front-matter + body +
 * [[wikilinks]]), same conventions as memory/. This script:
 *
 *   1. Parses every note: front-matter (title/topic/tags/form_fields/
 *      year_sensitive), body, and [[wikilink]] targets.
 *   2. Chunks long notes on "## " headings (each section becomes its own
 *      row; a note with no H2 headings stays a single chunk).
 *   3. Upserts the chunks into public.knowledge_chunks via the service-role
 *      client (supabase/migrations/20260818100000_knowledge_chunks.sql),
 *      and deletes rows for notes removed from the vault (delete-then-upsert
 *      per note, so a renamed/removed heading doesn't leave an orphan row).
 *   4. Writes knowledge/toc.generated.json — one row per NOTE (not per
 *      chunk): {id, title, topic, summary}. This file is committed and
 *      statically imported by src/lib/agent/tools.ts as a prompt-cached
 *      system block, so it must exist and be valid JSON even when the vault
 *      is empty (ships as `[]`) or Supabase isn't reachable.
 *
 * No numeric tax figures are authoritative here — notes may explain a rule
 * in prose, but src/lib/agent/tools.ts instructs the model to quote numbers
 * only from the calculator tools, never from a chunk body.
 *
 * Usage:
 *   node scripts/index-knowledge.mjs               # full sync (needs Supabase env)
 *   node scripts/index-knowledge.mjs --dry-run      # parse + write the TOC only
 *   node scripts/index-knowledge.mjs --dir <path>   # index a different vault dir
 *                                                    # (used by tests against fixtures)
 *
 * Runnable locally (reads .env.local/.env if present, without adding a
 * dotenv dependency) and in CI (real env vars already set).
 */

import { createClient } from "@supabase/supabase-js";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

/* ──────────────────────────────────────────────────────────────────────────
 * Pure parsing helpers — exported so tests/unit can exercise them directly
 * against fixture strings/directories without touching Supabase.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Minimal Obsidian-style front-matter parser: `---\n<yaml-ish>\n---\n<body>`.
 * Supports the vault contract's field shapes only (strings, booleans,
 * inline `[a, b]` arrays, and block `- item` arrays) — not a general YAML
 * parser, deliberately, to avoid a new dependency for a narrow contract.
 */
export function parseFrontMatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw };
  const firstNewline = raw.indexOf("\n");
  if (firstNewline === -1) return { data: {}, content: raw };
  const end = raw.indexOf("\n---", firstNewline);
  if (end === -1) return { data: {}, content: raw };
  const fmBlock = raw.slice(firstNewline + 1, end);
  const rest = raw.slice(end + 4);
  const content = rest.replace(/^\r?\n/, "");

  const data = {};
  const lines = fmBlock.split(/\r?\n/);
  let i = 0;
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "");
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rawRest = m[2].trim();

    if (rawRest === "") {
      // Possible block list on the following indented "- item" lines.
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(unquote(lines[j].replace(/^\s+-\s+/, "")));
        j++;
      }
      data[key] = items; // [] if the key had no value and no list follows
      i = j > i + 1 ? j : i + 1;
      continue;
    }

    if (rawRest.startsWith("[") && rawRest.endsWith("]")) {
      const inner = rawRest.slice(1, -1).trim();
      data[key] = inner === "" ? [] : inner.split(",").map(unquote).filter(Boolean);
      i++;
      continue;
    }

    if (rawRest === "true" || rawRest === "false") {
      data[key] = rawRest === "true";
      i++;
      continue;
    }

    data[key] = unquote(rawRest);
    i++;
  }
  return { data, content };
}

/** [[Target]], [[Target|Label]], [[Target#Heading]] → "Target" (deduped, order-preserving). */
export function extractWikilinks(body) {
  const seen = new Set();
  const out = [];
  const re = /\[\[([^\]|#]+)/g;
  let m;
  while ((m = re.exec(body))) {
    const target = m[1].trim();
    if (target && !seen.has(target)) {
      seen.add(target);
      out.push(target);
    }
  }
  return out;
}

export function slugify(s) {
  const slug = s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/**
 * Splits a note body on "## " (H2) headings into chunk rows. Any content
 * before the first H2 becomes its own "#intro" chunk (only when non-empty).
 * A note with no H2 headings stays a single chunk keyed by its note path.
 */
export function chunkNote(notePathNoExt, title, body) {
  const headingRe = /^##[ \t]+(.+)$/gm;
  const matches = [...body.matchAll(headingRe)];

  if (matches.length === 0) {
    const trimmed = body.trim();
    return trimmed ? [{ id: notePathNoExt, title, body: trimmed }] : [];
  }

  const chunks = [];
  const introEnd = matches[0].index;
  const intro = body.slice(0, introEnd).trim();
  if (intro) {
    chunks.push({ id: `${notePathNoExt}#intro`, title, body: intro });
  }
  for (let k = 0; k < matches.length; k++) {
    const heading = matches[k][1].trim();
    const start = matches[k].index + matches[k][0].length;
    const end = k + 1 < matches.length ? matches[k + 1].index : body.length;
    const sectionBody = body.slice(start, end).trim();
    if (!sectionBody) continue;
    chunks.push({
      id: `${notePathNoExt}#${slugify(heading)}`,
      title: `${title} — ${heading}`,
      body: sectionBody,
    });
  }
  return chunks;
}

/** [[Target]]/[[Target|Label]]/[[Target#Heading]] → plain display text (no brackets). */
export function renderWikilinksForDisplay(text) {
  return text
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\]\]/g, "$1");
}

/** First sentence (., !, ? terminated) or, failing that, a truncated lead-in. */
export function firstSentence(body) {
  const text = renderWikilinksForDisplay(body).trim();
  if (!text) return "";
  const m = text.match(/^[^.!?\n]{1,240}[.!?]/);
  if (m) return m[0].trim();
  const firstLine = text.split(/\r?\n/, 1)[0].trim();
  return firstLine.length > 140 ? `${firstLine.slice(0, 140)}…` : firstLine;
}

/**
 * Parses one note file's raw text into: note-level metadata (for the TOC)
 * plus its chunk rows (for the DB). `notePath` is vault-relative with
 * forward slashes (e.g. "regulatory/osek-zeir.md").
 */
export function parseNoteFile(notePath, raw) {
  const { data, content } = parseFrontMatter(raw);
  const notePathNoExt = notePath.replace(/\.md$/, "");
  const fallbackTitle = notePathNoExt.split("/").pop();
  const title =
    typeof data.title === "string" && data.title.trim() ? data.title.trim() : fallbackTitle;
  const topic = typeof data.topic === "string" && data.topic.trim() ? data.topic.trim() : null;
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  // Vault contract (knowledge/README.md, "חוזה ה-vault") names this
  // front-matter key `related_fields`; `form_fields` is accepted too as a
  // synonym so the DB column name (chosen in the migration task) doesn't
  // force vault authors to use a different key than the documented one.
  const formFieldsRaw = Array.isArray(data.related_fields)
    ? data.related_fields
    : Array.isArray(data.form_fields)
      ? data.form_fields
      : [];
  const formFields = formFieldsRaw.map(String);
  const yearSensitive = data.year_sensitive === true;

  const chunks = chunkNote(notePathNoExt, title, content).map((c) => ({
    id: c.id,
    note_path: notePath,
    title: c.title,
    topic,
    tags,
    form_fields: formFields,
    year_sensitive: yearSensitive,
    body: c.body,
    links: extractWikilinks(c.body),
  }));

  return { notePath, title, topic, body: content, chunks };
}

/** One TOC row per note (chunk-level would bloat the prompt-cached block). */
export function buildToc(notes) {
  return notes
    .map((n) => ({
      id: n.notePath.replace(/\.md$/, ""),
      title: n.title,
      topic: n.topic,
      summary: firstSentence(n.body),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "he"));
}

/* ──────────────────────────────────────────────────────────────────────────
 * Filesystem / env plumbing
 * ────────────────────────────────────────────────────────────────────────── */

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      // README.md is vault documentation (the "vault contract" itself, see
      // knowledge/README.md), not a content note — indexing it would put
      // meta-documentation into search results and the TOC alongside real
      // regulatory notes. Skip it at any depth, case-insensitively.
      else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".md") &&
        entry.name.toLowerCase() !== "readme.md"
      )
        out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/** Reads a dotenv-style file into process.env WITHOUT overriding real env vars. */
function loadDotEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const args = { dir: "knowledge", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") args.dir = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

/** Parses every *.md under vaultDir into {notes, toc}. Pure w.r.t. Supabase. */
export function loadVault(vaultDir) {
  const files = listMarkdownFiles(vaultDir);
  const notes = files.map((file) => {
    const notePath = relative(vaultDir, file).split(sep).join("/");
    const raw = readFileSync(file, "utf8");
    return parseNoteFile(notePath, raw);
  });
  return { notes, toc: buildToc(notes) };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Supabase sync
 * ────────────────────────────────────────────────────────────────────────── */

async function syncToSupabase(notes) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — cannot sync to Supabase. Use --dry-run to only regenerate the TOC.",
    );
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const currentNotePaths = new Set(notes.map((n) => n.notePath));

  // 1) Remove notes that no longer exist in the vault.
  const { data: existing, error: listErr } = await supabase
    .from("knowledge_chunks")
    .select("note_path");
  if (listErr) {
    throw new Error(`Failed to list existing knowledge_chunks: ${listErr.message}`);
  }
  const existingPaths = [...new Set((existing ?? []).map((r) => r.note_path))];
  const stale = existingPaths.filter((p) => !currentNotePaths.has(p));
  if (stale.length) {
    const { error } = await supabase.from("knowledge_chunks").delete().in("note_path", stale);
    if (error) throw new Error(`Failed to delete stale notes: ${error.message}`);
    console.log(`[index-knowledge] removed ${stale.length} note(s) no longer in the vault`);
  }

  // 2) Delete-then-upsert per note (clears orphaned chunk ids when a note's
  // headings changed — a plain upsert would leave the old heading's row).
  let chunkCount = 0;
  for (const note of notes) {
    const { error: delErr } = await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("note_path", note.notePath);
    if (delErr) throw new Error(`Failed to clear ${note.notePath}: ${delErr.message}`);
    if (note.chunks.length === 0) continue;
    const { error: upErr } = await supabase
      .from("knowledge_chunks")
      .upsert(note.chunks, { onConflict: "id" });
    if (upErr) throw new Error(`Failed to upsert ${note.notePath}: ${upErr.message}`);
    chunkCount += note.chunks.length;
  }
  console.log(`[index-knowledge] synced ${notes.length} note(s), ${chunkCount} chunk(s)`);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Entry point
 * ────────────────────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadDotEnvFile(join(REPO_ROOT, ".env.local"));
  loadDotEnvFile(join(REPO_ROOT, ".env"));

  const vaultDir = join(REPO_ROOT, args.dir);
  if (!existsSync(vaultDir)) {
    console.warn(`[index-knowledge] vault dir ${vaultDir} does not exist yet — writing an empty TOC.`);
  }
  const { notes, toc } = loadVault(vaultDir);

  mkdirSync(vaultDir, { recursive: true });
  const tocPath = join(vaultDir, "toc.generated.json");
  writeFileSync(tocPath, `${JSON.stringify(toc, null, 2)}\n`, "utf8");
  console.log(
    `[index-knowledge] parsed ${notes.length} note(s), wrote ${toc.length} TOC entr${toc.length === 1 ? "y" : "ies"} to ${relative(REPO_ROOT, tocPath)}`,
  );

  if (args.dryRun) {
    console.log("[index-knowledge] --dry-run: skipping Supabase sync");
    return;
  }

  await syncToSupabase(notes);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error("[index-knowledge] failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
