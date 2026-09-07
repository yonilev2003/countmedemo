/**
 * Golden tests — onboarding draft persistence (lib/setup-draft.ts).
 * Locks the privacy policy decided 2026-09-06 (memory/decisions.md): ID number
 * and bank account fields are NEVER written; 72h TTL; explicit clear.
 */

import { describe, it, expect } from "vitest";
import {
  saveSetupDraft,
  loadSetupDraft,
  clearSetupDraft,
  isDraftMeaningful,
  sanitizeDraftInput,
  draftAgeLabelHe,
  SETUP_DRAFT_KEY,
  SETUP_DRAFT_TTL_MS,
  type DraftStorage,
  type SetupDraftInput,
} from "@/lib/setup-draft";

function memStorage(): DraftStorage & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const input = (over: Partial<SetupDraftInput> = {}): SetupDraftInput => ({
  screen: 3,
  selectedYear: 2026,
  s1: { firstName: "דנה", lastName: "כהן", teudatZehut: "123456782", birthDate: "2008-01-01", gender: "female" },
  s2: { isSoldierDischarged: false, children: [] },
  s3: { tradeName: "סטודיו", osekType: "patur", osekTrackPicked: true },
  s4: { totalRevenue: "50000" },
  s5: { totalDeductibleExpenses: "1000" },
  s6: { bankName: "לאומי", bankCode: "10", branchCode: "800", accountNumber: "123456" },
  ...over,
});

describe("privacy policy — excluded fields are never persisted", () => {
  it("strips teudatZehut and the three bank-account fields, keeps bankName", () => {
    const clean = sanitizeDraftInput(input());
    expect(clean.s1).not.toHaveProperty("teudatZehut");
    expect(clean.s1.firstName).toBe("דנה");
    expect(clean.s6).toEqual({ bankName: "לאומי" });
  });

  it("the raw stored JSON does not contain the ID number or account number", () => {
    const st = memStorage();
    saveSetupDraft(input(), 1_000, st);
    const raw = st.dump()[SETUP_DRAFT_KEY];
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("123456782");
    expect(raw).not.toContain("accountNumber");
    expect(raw).not.toContain("branchCode");
    expect(raw).toContain("דנה");
  });

  it("re-sanitizes on read even if an excluded field was somehow stored", () => {
    const st = memStorage();
    st.setItem(
      SETUP_DRAFT_KEY,
      JSON.stringify({ v: 1, savedAt: 1_000, screen: 2, selectedYear: 2026, s1: { teudatZehut: "999" }, s2: {}, s3: {}, s4: {}, s5: {}, s6: { accountNumber: "1" } }),
    );
    const d = loadSetupDraft(2_000, st);
    expect(d?.s1).not.toHaveProperty("teudatZehut");
    expect(d?.s6).not.toHaveProperty("accountNumber");
  });
});

describe("round trip, TTL and clear", () => {
  it("saves and restores screen, year and sections", () => {
    const st = memStorage();
    expect(saveSetupDraft(input(), 1_000, st)).toBe(true);
    const d = loadSetupDraft(2_000, st);
    expect(d?.screen).toBe(3);
    expect(d?.selectedYear).toBe(2026);
    expect(d?.s4.totalRevenue).toBe("50000");
    expect(d?.savedAt).toBe(1_000);
  });

  it("expires after 72h and deletes itself on that read", () => {
    const st = memStorage();
    saveSetupDraft(input(), 1_000, st);
    expect(loadSetupDraft(1_000 + SETUP_DRAFT_TTL_MS + 1, st)).toBeNull();
    expect(st.dump()[SETUP_DRAFT_KEY]).toBeUndefined();
  });

  it("is still valid one minute before the TTL", () => {
    const st = memStorage();
    saveSetupDraft(input(), 1_000, st);
    expect(loadSetupDraft(1_000 + SETUP_DRAFT_TTL_MS - 60_000, st)).not.toBeNull();
  });

  it("clearSetupDraft removes the key", () => {
    const st = memStorage();
    saveSetupDraft(input(), 1_000, st);
    clearSetupDraft(st);
    expect(loadSetupDraft(2_000, st)).toBeNull();
  });

  it("malformed JSON is discarded, not thrown", () => {
    const st = memStorage();
    st.setItem(SETUP_DRAFT_KEY, "{not json");
    expect(loadSetupDraft(1, st)).toBeNull();
  });
});

describe("empty drafts are never written / never offered", () => {
  it("a pristine wizard is not meaningful", () => {
    const pristine = input({
      s1: { firstName: "", lastName: "", teudatZehut: "", birthDate: "", gender: "" },
      s2: { isSoldierDischarged: false, children: [] },
      s3: { tradeName: "", osekTrackPicked: false },
      s4: { totalRevenue: "" },
      s5: { totalDeductibleExpenses: "" },
      s6: { bankName: "" },
    });
    expect(isDraftMeaningful(sanitizeDraftInput(pristine))).toBe(false);
    const st = memStorage();
    expect(saveSetupDraft(pristine, 1, st)).toBe(false);
    expect(st.dump()[SETUP_DRAFT_KEY]).toBeUndefined();
  });

  it("a draft whose ONLY content was the (excluded) ID number is not meaningful after sanitising", () => {
    const onlyId = input({
      s1: { firstName: "", lastName: "", teudatZehut: "123456782", birthDate: "", gender: "" },
      s2: { children: [] },
      s3: { tradeName: "", osekTrackPicked: false },
      s4: { totalRevenue: "" },
      s5: {},
      s6: { bankName: "", accountNumber: "1" },
    });
    expect(isDraftMeaningful(sanitizeDraftInput(onlyId))).toBe(false);
  });
});

describe("draftAgeLabelHe", () => {
  it("formats minutes/hours/days", () => {
    expect(draftAgeLabelHe(0, 20_000)).toBe("לפני רגע");
    expect(draftAgeLabelHe(0, 5 * 60_000)).toBe("לפני 5 דקות");
    expect(draftAgeLabelHe(0, 3 * 3_600_000)).toBe("לפני 3 שעות");
    expect(draftAgeLabelHe(0, 2 * 86_400_000)).toBe("לפני 2 ימים");
  });
});
