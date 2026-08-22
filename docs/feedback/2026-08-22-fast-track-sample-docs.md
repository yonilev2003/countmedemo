# Prep for the next Claude-in-Chrome test round — fast-track upload sample docs

Tomi's onboarding notes (2026-08-22), item 1: the fast-track upload card in `/setup`
(screen 1, "עוסקים מנוסים? תחסכו לעצמכם זמן") is now framed for experienced osek
holders who already have documents on hand. To actually exercise it in a live
Chrome test, prepare 4 real sample files in advance — the upload API rejects
files that don't match, so a placeholder/blank file per slot won't pass.

Source: `src/app/api/upload/route.ts` (validation + Claude-vision extraction
prompts), `src/components/upload/document-upload.tsx` (`SLOTS`).

## Slot 1 — דו״ח הכנסות תקופתי (income-report)

- File type: real PDF (`.pdf`, magic bytes must start `%PDF-` — a renamed
  non-PDF is rejected).
- Content the extractor looks for: total revenue **excluding VAT** in ₪, an
  osek file number (8-9 digits), the phrase "עוסק פטור" or "עוסק מורשה"
  somewhere in the document, a date range, ideally full name/email/phone/address.
- Sample to prepare: a PDF with Hebrew text along the lines of "עוסק מורשה",
  an amount like "248,500 ₪ (לפני מע״מ)", a 9-digit osek number, and a 2025
  date range.

## Slot 2 — אקסל הוצאות (expenses-excel)

- File type: real `.xlsx` (the backend only accepts `.xlsx` — a `.xls` file
  passes the browser's file picker but fails server-side; don't prepare `.xls`).
  Magic bytes must be a ZIP container (`PK\x03\x04`).
- Content: a header row within the first 10 rows of sheet 1 with Hebrew
  column labels — needs a category column (matches `/פירוט|קטגוריה|סוג/`) and
  at least one amount column (`/סכום כולל.*מע"מ/` or `/ללא מע"מ/`).
- Sample to prepare: header row `תאריך | שם | מספר קבלה | סכום כולל מע"מ |
  סכום ללא מע"מ | פירוט`, then a few data rows with a real Hebrew category
  string and a positive amount.

## Slot 3 — טופס 106 (form-106)

- File type: real PDF, same magic-byte gate as slot 1.
- Content: an Israeli annual salary slip — needs employer name + gross
  salary figure recognizable in the text.
- Sample to prepare: a PDF with "טופס 106", an employer name, and a gross
  salary number.

## Slot 4 — קבלות תרומה, סעיף 46 (donations)

- File type: real PDF, same magic-byte gate.
- Content: a donation receipt/confirmation under Section 46 (recognized
  institution), with a ₪ amount.
- Sample to prepare: a PDF resembling a קבלה/אישור תרומה with a shekel amount.

## General

- Max 5 MB per file (all 4 slots).
- The group-level "דלג על העלאה" button and the new per-slot "אעלה בהמשך"
  affordance (added alongside this copy change) don't need sample files —
  only exercise them to confirm the deferred-state UI, not extraction.
