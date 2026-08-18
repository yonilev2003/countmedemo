// Type declarations for index-knowledge.mjs, consumed by
// tests/unit/knowledge/index-knowledge.test.ts. Kept separate from the
// runtime file (plain JS, deliberately dependency-free) so the pure parsing
// helpers are still properly typed for TS test callers instead of falling
// back to TS's best-effort (and here, incomplete) structural inference over
// untyped JS.

export interface FrontMatterResult {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontMatter(raw: string): FrontMatterResult;
export function extractWikilinks(body: string): string[];
export function renderWikilinksForDisplay(text: string): string;
export function slugify(s: string): string;
export function firstSentence(body: string): string;

export interface NoteChunk {
  id: string;
  title: string;
  body: string;
}

export function chunkNote(notePathNoExt: string, title: string, body: string): NoteChunk[];

export interface KnowledgeChunkRow {
  id: string;
  note_path: string;
  title: string;
  topic: string | null;
  tags: string[];
  form_fields: string[];
  year_sensitive: boolean;
  body: string;
  links: string[];
}

export interface ParsedNote {
  notePath: string;
  title: string;
  topic: string | null;
  body: string;
  chunks: KnowledgeChunkRow[];
}

export function parseNoteFile(notePath: string, raw: string): ParsedNote;

export interface TocEntry {
  id: string;
  title: string;
  topic: string | null;
  summary: string;
}

export function buildToc(
  notes: { notePath: string; title: string; topic: string | null; body: string }[],
): TocEntry[];

export interface VaultIndex {
  notes: ParsedNote[];
  toc: TocEntry[];
}

export function loadVault(vaultDir: string): VaultIndex;
