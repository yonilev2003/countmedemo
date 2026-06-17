# status — איפה אנחנו עכשיו

> עודכן: 2026-06-17 · ענף עבודה: `claude/beta-launch-prep-z2m6f5` · ספרינט הכנה-לבטא פעיל.
> מקור-אמת לספרינט: `docs/launch/sprint-checklist.md` (צ׳קליסט בוקר לכל סשן).

## 🏃 ספרינט בטא (4 ימים) — יום 1 הושלם
תוכנית: 4 workstreams — עיצוב/motion · auth+תשלומים (Tranzila ready-to-connect, כבוי) ·
הצהרת הון (1219 מלא) · הקשחה+אנליטיקס. **build ירוק, tsc נקי.** פירוט מלא ב-sprint-checklist.
- ⚠️ **חוסם:** ה-Supabase MCP מחובר לחשבון שרואה רק `akfgudspliyymiysajoh`+`BlondeShell`
  (שניהם paused), **לא** את `hbsgzelipeawkvtcazdr` ה"חי". **המיגרציות (billing+events) לא הוחלו** —
  יוני צריך לאמת איזה פרויקט חי ולהחיל ידנית + לרגנרט database.types.

---

> עודכן: 2026-06-10 · ענף: `main` (פרודקשן חי) · פיילוט SaaS חי ב-`countmedemo-eight.vercel.app`.

## מצב — פיילוט חי בפרודקשן 🟢
ב-10.6 עברנו מ-דמו-localStorage ל-**פלטפורמת SaaS חיה ומאובטחת**. **10 PRs מוזגו ל-main, אפס שבירות.**

- ✅ **Backend חי:** Supabase (פרויקט `hbsgzelipeawkvtcazdr`) + Google OAuth (עובד) + persona per-user ב-DB + RLS.
- ✅ **כיול 2025:** נק' זיכוי 3.25, מע"מ דינמי 18%, מספרי-ברזל ב"ל 2025 (90,264/588,360 + פיצול בריאות), מילואים 30/40/50, 6111 256,410 ללא מע"מ.
- ✅ **מוצר/מיצוב:** עוסק יחידים-בלבד (זעיר/פטור/מורשה), **"עובדות לא עצות"**.
- ✅ **עיצוב:** /login+landing+chat מיושרים ל-handoff + **chat SaaS rail**.
- ✅ **אבטחה:** persona DB-authoritative + תיקון דליפה בין-משתמשים.

## ⚠️ Gating עדיין כבוי
ה-auth-gating **בנוי ומוכן בדגל** (`AUTH_GATING_ENABLED`) אבל **כבוי** — האפליקציה עדיין פתוחה (לא "נעולה"). הדלקה = פעולה ידנית של יוני.

## חסום — ממתין
| נושא | חסום על | מה צריך |
|---|---|---|
| **הדלקת gating** | יוני (ידני) | `AUTH_GATING_ENABLED=true` ב-Vercel + redeploy |
| **self-test מייסדים** | יוני/תומי/רוי | כניסה חיה /login → auth → חשבונית → אימות 18%+בידוד |
| **חשיפה חיצונית/EY** | יעל (משפטי) | אישור פרטיות/ToS/קופי לפני external |
| **NEEDS-ROY 2025** | רוי | תקרות פנסיה (25,608/12,804), פיצול מס-בריאות, מילואים מול תיקון 283 |

## פתוח (לא חוסם)
- design-review של המסכים החדשים (login/landing/chat) — עין אנושית.
- ריבוי-חשבונות: Supabase (`hbsgz` מול `akfg`) + Vercel (`countmedemo-eight` מול `countmes-projects`) — לסדר בהמשך.
- refactor DB-only (הסרת localStorage) — מסומן, אחרי שה-gating חי ומוכח.

## נקודות-כניסה לקוד החדש
| נושא | קבצים |
|---|---|
| Supabase clients | `src/lib/supabase/{client,server,admin,proxy}.ts` |
| שכבת-נתונים DB | `src/lib/data/{persona-repository,persona-store,use-persona}.ts` |
| auth | `src/app/login/*`, `src/app/auth/*`, `middleware.ts` |
| דשבורד device-adaptive | `src/app/dashboard/page.tsx`, `src/components/dashboard/*` |
| קבועי-מס 2025 | `src/lib/calculators/types.ts` (`getTaxYearConstants`) |
| audits/אסטרטגיה | `docs/audit/*`, `docs/gtm/readiness.md`, `docs/spikes/*` |
