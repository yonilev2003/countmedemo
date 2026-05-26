/**
 * Regulatory-Watch — dedup store.
 *
 * Persists the set of RegulatoryItem ids we've already processed so the daily
 * run never reports the same publication twice. Backed by a small JSON file
 * (path overridable via REGWATCH_SEEN_PATH); the list is capped so it can't
 * grow without bound across years of runs.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MAX_IDS = 5000;

function seenPath(): string {
  return (
    process.env.REGWATCH_SEEN_PATH ??
    join(process.cwd(), ".regulatory-watch", "seen.json")
  );
}

export async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await readFile(seenPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.ids)) return new Set(parsed.ids as string[]);
    return new Set();
  } catch {
    // Missing/corrupt file on first run — start empty.
    return new Set();
  }
}

export async function saveSeen(ids: Set<string>): Promise<void> {
  const path = seenPath();
  await mkdir(dirname(path), { recursive: true });
  // Keep the most-recent MAX_IDS (Set preserves insertion order).
  const trimmed = [...ids].slice(-MAX_IDS);
  await writeFile(path, JSON.stringify({ ids: trimmed }, null, 2), "utf8");
}
