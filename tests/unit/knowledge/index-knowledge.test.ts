/**
 * Vault-indexer golden tests (RAG audit #20, 2026-08-18).
 *
 * Exercises the PURE parsing/chunking helpers in scripts/index-knowledge.mjs
 * against hand-written fixtures (tests/fixtures/knowledge/) — never against
 * the real knowledge/ vault, which the parallel "vault agent" owns and is
 * still populating. No Supabase involved (loadVault/parseNoteFile do zero
 * I/O beyond reading .md files).
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  parseFrontMatter,
  extractWikilinks,
  slugify,
  chunkNote,
  firstSentence,
  renderWikilinksForDisplay,
  parseNoteFile,
  buildToc,
  loadVault,
} from "../../../scripts/index-knowledge.mjs";

const FIXTURE_DIR = join(process.cwd(), "tests", "fixtures", "knowledge");

describe("parseFrontMatter", () => {
  it("parses strings, inline arrays, and booleans", () => {
    const raw = [
      "---",
      'title: "כותרת לדוגמה"',
      "topic: מס-הכנסה",
      "tags: [א, ב, ג]",
      "year_sensitive: true",
      "---",
      "",
      "גוף הפתק.",
    ].join("\n");
    const { data, content } = parseFrontMatter(raw);
    expect(data.title).toBe("כותרת לדוגמה");
    expect(data.topic).toBe("מס-הכנסה");
    expect(data.tags).toEqual(["א", "ב", "ג"]);
    expect(data.year_sensitive).toBe(true);
    expect(content.trim()).toBe("גוף הפתק.");
  });

  it("parses block-style (- item) arrays", () => {
    const raw = ["---", "tags:", "  - א", "  - ב", "---", "גוף"].join("\n");
    const { data } = parseFrontMatter(raw);
    expect(data.tags).toEqual(["א", "ב"]);
  });

  it("returns empty data + the raw text unchanged when there is no front matter", () => {
    const raw = "גוף בלי front-matter בכלל.";
    const { data, content } = parseFrontMatter(raw);
    expect(data).toEqual({});
    expect(content).toBe(raw);
  });

  it("year_sensitive false and empty inline array parse correctly", () => {
    const raw = ["---", "year_sensitive: false", "tags: []", "---", "x"].join("\n");
    const { data } = parseFrontMatter(raw);
    expect(data.year_sensitive).toBe(false);
    expect(data.tags).toEqual([]);
  });
});

describe("extractWikilinks", () => {
  it("captures [[Target]], [[Target|Label]], [[Target#Heading]] and dedupes", () => {
    const body = "ראו [[א]], [[ב|תווית]], [[א#פרק]] ושוב [[א]].";
    expect(extractWikilinks(body)).toEqual(["א", "ב"]);
  });

  it("empty body → empty array", () => {
    expect(extractWikilinks("")).toEqual([]);
  });
});

describe("renderWikilinksForDisplay", () => {
  it("strips wikilink brackets, preferring the label when present", () => {
    expect(renderWikilinksForDisplay("ראו [[א|התווית]] ו[[ב]].")).toBe("ראו התווית וב.");
  });
});

describe("slugify", () => {
  it("slugifies Hebrew headings to dash-separated tokens", () => {
    expect(slugify("מי זכאי")).toBe("מי-זכאי");
    expect(slugify("  איך עוברים למורשה  ")).toBe("איך-עוברים-למורשה");
  });

  it("falls back to 'section' when nothing alphanumeric survives", () => {
    expect(slugify("!!!")).toBe("section");
    expect(slugify("")).toBe("section");
  });
});

describe("chunkNote", () => {
  it("returns a single chunk for a note with no H2 headings", () => {
    const chunks = chunkNote("tax/note-b", "עוסק פטור", "גוף קצר בלי כותרות.");
    expect(chunks).toEqual([{ id: "tax/note-b", title: "עוסק פטור", body: "גוף קצר בלי כותרות." }]);
  });

  it("splits on H2 into intro + one chunk per section", () => {
    const body = ["הקדמה.", "", "## פרק א", "", "תוכן א.", "", "## פרק ב", "", "תוכן ב."].join("\n");
    const chunks = chunkNote("tax/note-a", "כותרת", body);
    expect(chunks.map((c) => c.id)).toEqual([
      "tax/note-a#intro",
      "tax/note-a#פרק-א",
      "tax/note-a#פרק-ב",
    ]);
    expect(chunks[0].body).toBe("הקדמה.");
    expect(chunks[1]).toEqual({ id: "tax/note-a#פרק-א", title: "כותרת — פרק א", body: "תוכן א." });
    expect(chunks[2].body).toBe("תוכן ב.");
  });

  it("omits the intro chunk when there is no content before the first heading", () => {
    const body = "## פרק א\n\nתוכן.";
    const chunks = chunkNote("n", "כ", body);
    expect(chunks.map((c) => c.id)).toEqual(["n#פרק-א"]);
  });

  it("empty note with no headings produces zero chunks", () => {
    expect(chunkNote("n", "כ", "   \n  ")).toEqual([]);
  });
});

describe("firstSentence", () => {
  it("takes the first sentence up to . ! or ?", () => {
    expect(firstSentence("משפט ראשון. משפט שני.")).toBe("משפט ראשון.");
    expect(firstSentence("שאלה? תשובה.")).toBe("שאלה?");
  });

  it("falls back to a truncated first line when there is no terminator", () => {
    expect(firstSentence("שורה בלי נקודה בסוף")).toBe("שורה בלי נקודה בסוף");
  });

  it("strips wikilink brackets before computing the sentence", () => {
    expect(firstSentence("ראו [[פתק אחר|כאן]]. עוד טקסט.")).toBe("ראו כאן.");
  });
});

describe("parseNoteFile — full contract", () => {
  it("maps front-matter (incl. related_fields → form_fields) into every chunk row", () => {
    const raw = [
      "---",
      'title: "עוסק זעיר"',
      "topic: עוסק-פטור-זעיר-מורשה",
      "tags: [א]",
      'related_fields: ["238"]',
      "year_sensitive: true",
      "---",
      "",
      "הקדמה עם [[note-b]].",
      "",
      "## מי זכאי",
      "",
      "תוכן.",
    ].join("\n");
    const note = parseNoteFile("tax/note-a.md", raw);
    expect(note.title).toBe("עוסק זעיר");
    expect(note.chunks).toHaveLength(2);
    for (const chunk of note.chunks) {
      expect(chunk.note_path).toBe("tax/note-a.md");
      expect(chunk.topic).toBe("עוסק-פטור-זעיר-מורשה");
      expect(chunk.tags).toEqual(["א"]);
      expect(chunk.form_fields).toEqual(["238"]);
      expect(chunk.year_sensitive).toBe(true);
    }
    expect(note.chunks[0].links).toEqual(["note-b"]);
    expect(note.chunks[1].links).toEqual([]);
  });

  it("missing title falls back to the filename; missing related_fields/form_fields → []", () => {
    const note = parseNoteFile("tax/untitled.md", "---\ntopic: x\n---\nגוף.");
    expect(note.title).toBe("untitled");
    expect(note.chunks[0].form_fields).toEqual([]);
  });
});

describe("buildToc", () => {
  it("one row per note, sorted by title (he locale), with a clean summary", () => {
    const notes = [
      { notePath: "b.md", title: "בבב", topic: "t", body: "טקסט [[קישור|תווית]]. עוד." },
      { notePath: "a.md", title: "אאא", topic: null, body: "משהו." },
    ];
    const toc = buildToc(notes);
    expect(toc).toHaveLength(2);
    // Sort invariant, verified generically rather than assuming a specific
    // collation order for these two particular strings.
    for (let i = 1; i < toc.length; i++) {
      expect(toc[i - 1].title.localeCompare(toc[i].title, "he")).toBeLessThanOrEqual(0);
    }
    const bRow = toc.find((t) => t.id === "b");
    expect(bRow?.summary).toBe("טקסט תווית.");
    expect(bRow?.summary).not.toContain("[[");
  });
});

describe("loadVault — against the fixture directory", () => {
  const { notes, toc } = loadVault(FIXTURE_DIR);

  it("excludes README.md and finds exactly the two content notes", () => {
    expect(notes.map((n) => n.notePath).sort()).toEqual(["tax/note-a.md", "tax/note-b.md"]);
  });

  it("note-a chunks correctly: intro + 2 H2 sections, form_fields from related_fields, links resolved", () => {
    const noteA = notes.find((n) => n.notePath === "tax/note-a.md");
    expect(noteA).toBeDefined();
    expect(noteA!.chunks.map((c) => c.id)).toEqual([
      "tax/note-a#intro",
      "tax/note-a#מי-זכאי",
      "tax/note-a#איך-עוברים-למורשה",
    ]);
    expect(noteA!.chunks.every((c) => c.form_fields.length === 1 && c.form_fields[0] === "238")).toBe(true);
    expect(noteA!.chunks.every((c) => c.year_sensitive === true)).toBe(true);
    // intro links to note-b via [[note-b|עוסק פטור]]; the "מי זכאי" section has no link;
    // the third section links to note-b again via a bare [[note-b]].
    expect(noteA!.chunks[0].links).toEqual(["note-b"]);
    expect(noteA!.chunks[1].links).toEqual([]);
    expect(noteA!.chunks[2].links).toEqual(["note-b"]);
  });

  it("note-b has a single chunk (no H2 headings) with empty form_fields/links", () => {
    const noteB = notes.find((n) => n.notePath === "tax/note-b.md");
    expect(noteB).toBeDefined();
    expect(noteB!.chunks).toEqual([
      {
        id: "tax/note-b",
        note_path: "tax/note-b.md",
        title: "עוסק פטור",
        topic: "עוסק-פטור-זעיר-מורשה",
        tags: [],
        form_fields: [],
        year_sensitive: false,
        body: 'עוסק פטור הוא סוג עוסק שאינו גובה מע"מ. משפט שני להמשך ההסבר.',
        links: [],
      },
    ]);
  });

  it("the derived TOC has one row per note (not per chunk) and never leaks README", () => {
    expect(toc).toHaveLength(2);
    expect(toc.find((t) => t.id === "README")).toBeUndefined();
    const rowA = toc.find((t) => t.id === "tax/note-a");
    expect(rowA?.title).toBe("עוסק זעיר - עקרונות");
    expect(rowA?.summary).toContain("עוסק פטור"); // wikilink label rendered plain, no brackets
    expect(rowA?.summary).not.toContain("[[");
  });

  it("a nonexistent vault directory yields zero notes, not a crash", () => {
    const empty = loadVault(join(FIXTURE_DIR, "does-not-exist"));
    expect(empty.notes).toEqual([]);
    expect(empty.toc).toEqual([]);
  });
});
