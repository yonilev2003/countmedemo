---
title: סטטוס מול התכנית (A–H) + מפת worktrees להמשך
type: launch / status
updated: 2026-06-19
branch: claude/beta-launch-prep-z2m6f5
plan: /root/.claude/plans/eager-hopping-blum.md
---

# סטטוס מול התכנית — A–H

מקרא: ✅ הושלם · 🟡 חלקי · 🔴 לא התחיל · ⏸️ מוקפא/לא רלוונטי כרגע · 🔑 תלוי-תנאי-מקדים

| WS | תיאור | סטטוס | מה כבר נעשה | מה נשאר |
|---|---|---|---|---|
| **A** | עיצוב/UX פרימיום (ה-"wow") | 🟡 ~30% | framer-motion + primitives (`motion.tsx`), ליטוש login + /home | מעבר מסך-אחר-מסך: dashboard, coach, invoices, deadlines, alerts, business-expenses, setup · skeletons/empty-states/micro-interactions · View Transitions למעברי route · a11y (ניגודיות `.calculated-value`, 44px, RTL ARIA) |
| **B** | Auth gating + סליקה ישראלית (כבוי) | ✅ ~90% | seam + tracks + סכמה + `/pricing` (CTA מחווט ל-checkout) + `getEntitlement()`/`requirePlan()` + routes `/api/billing/{checkout,webhook}` (idempotent, כבוי) | 🔑 הרצת SQL על hbsgz (בדיקה חיה) · 🔑 חיבור טרנזילה אמיתי (2 TODOs + sandbox creds) — מוכן-להטמעה |
| **C** | טופס 1219 (הצהרת הון) — מלא | ✅ ~95% | סכמה + persona + מחשבונים · עמוד `/file/1219` + highlight הון נקי · קליטה ב-`/setup/assets` · כרטיס ב-`/file` · דוגמת דנה (נטו 1,085,000) | ⏸️ קודי שדה רשמיים + כללי הערכה → `TODO(Roy)` |
| **D** | Hardening לשימוש יומי + 50 חברים | 🟡 ~60% | `track()`+events · rate-limit+ולידציה ל-`/api/chat` (כבר היה) · error boundaries (כבר היו) · **add-to-calendar** (Google+.ics) בדדליינים | קליטת מייל/טל' ב-setup + נדנוד מייל לפני דדליין (צריך תשתית שליחה) · 🔑 התראות Vercel/Anthropic · 🔑 פרטיות+ToS (יעל) |
| **E** | Login UX + OAuth + /home | ✅ ~95% | ליטוש login, /home device-adaptive, routing post-login, manifest start_url, קישור /pricing | ⏸️ מיתוג OAuth = קונסולה (אין יוזרים → נדחה) |
| **F** | רספונסיביות מלאה + PWA | 🟡 ~20% | manifest קיים | ביקורת 390/768/1024/1440 על כל העמודים · שכבת tablet (`md:`) · הידוק Recharts בנייד · `sw.js` offline + אימות התקנה |
| **G** | מילואים על 1301 — year-keyed | ✅ 100% | מנוע (סולם מלא +0.25/5 עד 4.0), N-1, persona, schema, setup, דנה, צפי | ⏸️ מדרגת-כניסה 2027 = `TODO(Roy)` (מוקפא לבקשתך) |
| **H** | איתן — tool-use + הקשר עשיר | ✅ ~95% | הקשר מחושב מלא + tools (`agent/tools.ts`) + לולאת tool-use | אימות RLS-scoping בריצה אמיתית (חלק מבדיקות הסיום) |

## מפת worktrees להמשך (מקבילי, מנוהל-קונפליקטים)

ארבעה worktrees מקבילים. **הקובץ החם המשותף הוא `src/app/setup/page.tsx`** (A+C+D נוגעים בו) —
לכן שינויי setup **מסדרתיים** (single-track), כפי שנעול ב-`memory/decisions.md`.

| Worktree | היקף | קבצים עיקריים | תלות |
|---|---|---|---|
| **WT-1 · design/responsive** (A+F) | ליטוש מסך-אחר-מסך + רספונסיב 390/768/1024/1440 + a11y + `sw.js` | `app/*/page.tsx`, `globals.css`, `components/{dashboard,agent,brand}/*`, `public/sw.js` | עצמאי (setup אחרון, אחרי C+D) |
| **WT-2 · 1219 UI** (C) | עמודי 1219 + demo + קליטת נכסים ב-setup | `app/file/1219/*`, `components/form-1219/*`, `app/setup/*`, `personas/*` | 🔑 Roy (כללי הערכה) — אבל המבנה אפשר עכשיו |
| **WT-3 · PSP+entitlement** (B) | מסלולי טרנזילה (כבוי) + entitlement | `app/api/billing/*`, `lib/billing/*`, `.env.template` | 🔑 SQL על hbsgz (לבדיקה חיה); קוד אפשר עכשיו |
| **WT-4 · hardening** (D) | תזכורות + rate-limit/ולידציה + error boundary | `app/api/{chat,coach}/*`, `app/setup/*`, `lib/deadlines/*`, `components/*` | 🔑 setup serialize מול C |

## תנאים מקדימים (סיכום — מי חוסם מה)

| תנאי | בעלים | חוסם | סטטוס |
|---|---|---|---|
| הרצת billing+events SQL על hbsgz | יוני | בדיקת B חיה מול DB | ממתין (SQL מוכן) |
| Tranzila sandbox creds + עוסק/חברה רשום | יוני | סליקה **חיה** (לא הקוד) | לא דחוף — בונים כבוי |
| כללי הערכה/הצהרה ל-1219 + קבועי 2025/26 `TODO(Roy)` | Roy | דיוק ערכי 1219 | מבנה לא חסום; ערכים מסומנים |
| מדיניות פרטיות + ToS | יעל | חשיפה ל-50 חברים | אין יוזרים → לא דחוף |
| flip `AUTH_GATING_ENABLED` | יוני | תחילת בטא | אין יוזרים → נדחה |

## הערכת היקף נותר (גס)
B(PSP+entitlement) + C(UI 1219) + D(תזכורות+הקשחה) + A/F(ליטוש+רספונסיב) ≈ עיקר העבודה שנותרה.
G ו-H ו-E סגורים. בסבב worktrees מקבילי — סדר גודל של 2–3 פאזות עבודה עד "מוכן-לבטא".
