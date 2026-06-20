---
title: חיבור ה-backend — hbsgz הוא הפרויקט האמיתי (תיקון יישור-קו)
type: launch / config
created: 2026-06-19
supersedes: ההחלטה הקודמת על akfg (בוטלה)
---

# יישור קו: ה-backend החי הוא `hbsgzelipeawkvtcazdr`

**תיקון:** בסשן קודם החלטתי להשתמש ב-`akfg` כי הוא היחיד שחשבון ה-MCP שלי רואה.
**זו הייתה טעות.** הפרויקט האמיתי, החי, שעליו רץ `countmedemo.vercel.app` ושבו יוני
עובד בקונסולה, הוא **`hbsgzelipeawkvtcazdr`** — בדיוק כמו ש-`memory/decisions.md` תיעד מלכתחילה.

- ✅ ה-init schema (profiles, RLS, persona, וכו') **כבר קיים** ב-hbsgz — הוא נבנה שם, וה-Google
  OAuth כבר עובד שם.
- ❌ מה ש**חסר** ב-hbsgz: שתי המיגרציות החדשות של הסשן הזה — **billing** ו-**events**.
- 🗑️ **akfg ננטש.** הוא חשבון אחר; השארנו בו עותק מלא של הסכמה אבל לא משתמשים בו. אין צורך
  לגעת בו. אם בעתיד נרצה לנקות — אפשר למחוק/להשהות אותו.
- `database.types.ts` תקף ל-hbsgz כמו ל-akfg (אותה סכמה בדיוק) — אין שינוי קוד נדרש.

## מה צריך לקרות ב-hbsgz (רק יוני — אין לי גישה אליו)

### 1. להריץ את billing + events ב-SQL Editor של hbsgz
hbsgz → **SQL Editor** → New query → להדביק ולהריץ, לפי הסדר:
1. תוכן `supabase/migrations/20260617090000_billing.sql`
2. תוכן `supabase/migrations/20260617091000_events.sql`

(הקבצים נמצאים ב-repo בענף `claude/beta-launch-prep-z2m6f5`. הטבלאות האלה עדיין לא קיימות
ב-hbsgz, אז ההרצה נקייה. **אם תרצה — אני מדביק לך כאן את ה-SQL המלא בהודעה.**)

אחרי ההרצה, hbsgz יכיל גם: `plans` (+ free/pro), `subscriptions`, `payments`, `events`.

### 2. Vercel env — חייב להצביע ל-hbsgz (לא akfg!)
⚠️ נתתי לך קודם ערכי **akfg** בטעות. אם שינית את `NEXT_PUBLIC_SUPABASE_URL` ל-akfg — **תחזיר
ל-hbsgz**:

| משתנה | ערך נכון |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hbsgzelipeawkvtcazdr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | hbsgz → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | hbsgz → Settings → API → service_role secret |

(הערכים האלה כנראה כבר היו שם מאז שהאתר עלה — רק לוודא שלא דרסתי אותם בעצתי השגויה.)

### 3. Google OAuth — כנראה כלום
ה-Google login כבר עובד מול hbsgz (יש client id+secret, ויש לוגו). ה-Redirect URI הנכון
(`https://hbsgzelipeawkvtcazdr.supabase.co/auth/v1/callback`) כבר מוגדר אחרת זה לא היה עובד.
היחיד שאולי כדאי: לוודא **App name = CountMe**, ולהוסיף את 50 המיילים כ-Test users אם
האפליקציה ב-Testing. ראה `oauth-branding.md`.
