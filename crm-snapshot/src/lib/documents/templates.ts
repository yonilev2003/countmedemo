import type { TiptapDoc } from "@/types/db";

export interface DocumentTemplate {
  key: string;
  label: string;
  description: string;
  buildTitle(): string;
  buildContent(): TiptapDoc;
}

const today = () => new Intl.DateTimeFormat("he-IL").format(new Date());

function doc(content: unknown[]): TiptapDoc {
  return { type: "doc", content };
}

function heading(level: number, text: string) {
  return {
    type: "heading",
    attrs: { level, textAlign: "right" },
    content: [{ type: "text", text }],
  };
}

function paragraph(text: string) {
  return {
    type: "paragraph",
    attrs: { textAlign: "right" },
    content: text ? [{ type: "text", text }] : [],
  };
}

function bulletList(items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

export const TEMPLATES: DocumentTemplate[] = [
  {
    key: "blank",
    label: "מסמך ריק",
    description: "התחל מאפס",
    buildTitle: () => "מסמך ללא שם",
    buildContent: () => doc([paragraph("")]),
  },
  {
    key: "meeting-notes",
    label: "פרוטוקול ישיבה",
    description: "תבנית עם משתתפים, החלטות, ופעולות לביצוע",
    buildTitle: () => `פרוטוקול ישיבה — ${today()}`,
    buildContent: () =>
      doc([
        heading(1, `פרוטוקול ישיבה — ${today()}`),
        heading(2, "משתתפים"),
        bulletList(["", ""]),
        heading(2, "סדר יום"),
        bulletList(["נושא ראשון", "נושא שני"]),
        heading(2, "החלטות"),
        paragraph(""),
        heading(2, "פעולות לביצוע"),
        bulletList(["משימה — אחראי — דדליין"]),
      ]),
  },
  {
    key: "proposal",
    label: "הצעת מחיר",
    description: "תבנית הצעה ללקוח",
    buildTitle: () => "הצעת מחיר",
    buildContent: () =>
      doc([
        heading(1, "הצעת מחיר"),
        paragraph(`לכבוד: [שם הלקוח]`),
        paragraph(`תאריך: ${today()}`),
        heading(2, "תיאור העבודה"),
        paragraph(""),
        heading(2, "תוצרים"),
        bulletList(["תוצר 1", "תוצר 2"]),
        heading(2, "לוח זמנים"),
        paragraph(""),
        heading(2, "מחיר"),
        paragraph(""),
        heading(2, "תנאי תשלום"),
        paragraph(""),
        heading(2, "תוקף ההצעה"),
        paragraph("ההצעה תקפה ל-30 יום מתאריך זה."),
      ]),
  },
  {
    key: "one-pager",
    label: "One Pager",
    description: "סיכום קצר של רעיון/פרויקט",
    buildTitle: () => "One Pager",
    buildContent: () =>
      doc([
        heading(1, "[שם הפרויקט]"),
        heading(2, "הבעיה"),
        paragraph(""),
        heading(2, "הפתרון"),
        paragraph(""),
        heading(2, "קהל יעד"),
        paragraph(""),
        heading(2, "מודל עסקי"),
        paragraph(""),
        heading(2, "שלב נוכחי"),
        paragraph(""),
        heading(2, "צוות"),
        paragraph(""),
      ]),
  },
  {
    key: "contact-brief",
    label: "תדריך לקוח",
    description: "סיכום נקודות מפתח על לקוח",
    buildTitle: () => "תדריך לקוח",
    buildContent: () =>
      doc([
        heading(1, "תדריך לקוח"),
        heading(2, "פרטים בסיסיים"),
        bulletList(["שם:", "חברה:", "תפקיד:", "מייל:", "טלפון:"]),
        heading(2, "רקע"),
        paragraph(""),
        heading(2, "צרכים"),
        paragraph(""),
        heading(2, "היסטוריית אינטראקציות"),
        paragraph(""),
        heading(2, "צעדים הבאים"),
        bulletList([""]),
      ]),
  },
];

export function getTemplate(key: string): DocumentTemplate {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}
