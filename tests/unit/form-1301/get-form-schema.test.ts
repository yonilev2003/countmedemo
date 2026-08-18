/**
 * Golden test for the year-keyed form-schema resolver (task #16).
 *
 * Today every year shares ONE static schema per form — this locks that in as
 * a "zero behavior change" contract: swapping in getFormSchema() must not
 * alter what any caller renders until a year genuinely diverges (see the
 * doc comment in lib/form-1301/get-form-schema.ts).
 */

import { describe, expect, it } from "vitest";
import { getFormSchema } from "@/lib/form-1301/get-form-schema";
import { form1301 } from "@/lib/form-1301/schema";
import { form1219 } from "@/lib/form-1219/schema";

describe("getFormSchema", () => {
  it("1301: returns the SAME schema reference across supported years (zero behavior change)", () => {
    expect(getFormSchema("1301", 2024)).toBe(getFormSchema("1301", 2026));
    expect(getFormSchema("1301", 2025)).toBe(form1301);
  });

  it("1219: returns the SAME schema reference across supported years", () => {
    expect(getFormSchema("1219", 2024)).toBe(getFormSchema("1219", 2026));
    expect(getFormSchema("1219", 2025)).toBe(form1219);
  });

  it("is stable for out-of-range years too (future-proofing, not a validation gate)", () => {
    expect(getFormSchema("1301", 1999)).toBe(form1301);
    expect(getFormSchema("1301", 2099)).toBe(form1301);
  });
});
