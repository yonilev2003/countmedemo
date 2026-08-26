#!/usr/bin/env node
/**
 * Bank-branch fetch script (research 26/08 — city/street/bank pickers).
 *
 * ⚠️ UNVERIFIED / NOT YET RUN. This script cannot be executed or tested from
 * this sandboxed session: data.gov.il is fully blocked by the sandbox's
 * network proxy (confirmed via direct curl — CONNECT tunnel fails with 403),
 * so there was no way to run it and inspect a real response. It is written
 * from a known-good reference implementation (see below) but has zero live
 * verification. Before trusting its output, run it from an unrestricted
 * network, inspect the resulting JSON by hand, and only then wire it into
 * israeli-geo-dataset.ts. Per this project's engine principle ("המנוע
 * דטרמיניסטי, לא ממציאים מספרים" — the engine is deterministic, we never
 * invent numbers), NO branch-level data has been fabricated to fill this
 * gap: BankNamePicker (src/components/setup/bank-name-picker.tsx) only
 * offers bank NAME + bank CODE, both from a verified source (see that file's
 * doc comment) — no branch code/name/address field exists anywhere in the
 * product yet.
 *
 * Source: data.gov.il's "סניפים של בנקים" (bank branches) dataset,
 * resource_id 2202bada-4baf-45f5-aa61-8c5bad9646d3
 * (https://data.gov.il/dataset/branches/resource/2202bada-4baf-45f5-aa61-8c5bad9646d3).
 * Endpoint + field mapping + the "add בנק הדואר manually" step below are
 * transcribed verbatim from the israeli-bank-autocomplete npm package
 * (github.com/ElishaMayer/israeli-bank-autocomplete, MIT), whose source was
 * inspected directly via `npm pack` since data.gov.il itself could not be
 * reached to verify the API shape independently. A limit of 1600 is what
 * that package's own README documents as "currently returns all results" —
 * re-check `result.total` in the response against `result.limit` on first
 * real run and raise the limit if data.gov.il's dataset has grown past it.
 *
 * Usage (from an environment with real internet access):
 *   node scripts/fetch-bank-branches.mjs
 *   → writes src/lib/geo/data/israeli-bank-branches.json
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_PATH = `${REPO_ROOT}src/lib/geo/data/israeli-bank-branches.json`;

const DATA_GOV_BASE_URL = "https://data.gov.il/api/3/action/datastore_search";
const RESOURCE_ID = "2202bada-4baf-45f5-aa61-8c5bad9646d3";
const LIMIT = 1600;

// CKAN field name → our camelCase field name, exactly as
// israeli-bank-autocomplete's lib/functions.js maps it.
const FIELD_MAP = {
  bankCode: "Bank_Code",
  bankName: "Bank_Name",
  branchCode: "Branch_Code",
  branchName: "Branch_Name",
  branchAddress: "Branch_Address",
  city: "City",
  zip: "Zip_Code",
  phone: "Telephone",
};

async function main() {
  const url = `${DATA_GOV_BASE_URL}?resource_id=${RESOURCE_ID}&limit=${LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`data.gov.il request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  const { total, limit, records } = data.result;
  if (total > limit) {
    console.warn(
      `[fetch-bank-branches] resource has ${total} records but limit is ${limit} — raise LIMIT and re-run, the output is truncated.`,
    );
  }

  const branches = records
    .map((record) => {
      const branch = {};
      for (const [ourKey, govKey] of Object.entries(FIELD_MAP)) {
        branch[ourKey] = record[govKey];
      }
      // CKAN's export escapes embedded quotes as "" (CSV convention) even in
      // the JSON API — undo it, matching the reference implementation.
      if (typeof branch.bankName === "string") {
        branch.bankName = branch.bankName.replace(/""/g, '"');
      }
      branch.bankCode = parseInt(branch.bankCode, 10);
      branch.branchCode = parseInt(branch.branchCode, 10);
      return branch;
    })
    // Rows with no bank code are header/footer artifacts in the raw export.
    .filter((branch) => Number.isFinite(branch.bankCode));

  // בנק הדואר (bank code 9) has no branch data in this CKAN resource —
  // the reference package adds one synthetic placeholder row for it.
  branches.push({
    bankCode: 9,
    bankName: "בנק הדואר",
    branchCode: 1,
    branchName: "",
    branchAddress: "",
    city: "",
    zip: "",
    phone: "",
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify(branches, null, 2) + "\n", "utf-8");
  console.log(`[fetch-bank-branches] wrote ${branches.length} branches to ${OUTPUT_PATH}`);
  console.log(
    "[fetch-bank-branches] UNVERIFIED — inspect the output by hand before wiring it into israeli-geo-dataset.ts.",
  );
}

main().catch((err) => {
  console.error("[fetch-bank-branches] failed:", err);
  process.exit(1);
});
