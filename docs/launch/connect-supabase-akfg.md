---
title: חיבור הלייב ל-Supabase akfg (החלטה + צעדים)
type: launch / config
created: 2026-06-19
---

# החלטה: ה-backend הוא `akfgudspliyymiysajoh`

**רקע:** `memory/decisions.md` נעל בעבר את `hbsgzelipeawkvtcazdr` כ-backend החי. אבל חשבון ה-MCP
שאני מחובר אליו **לא רואה את hbsgz בכלל** — רק `akfg` (countme, eu-central-1) ו-`BlondeShell`.
כלומר hbsgz יושב על **חשבון Supabase אחר** שאין לי גישה אליו.

**ההכרעה (יוני נתן לי להכריע, 2026-06-19):** מתקדמים עם **`akfg`** כ-backend היחיד.
- ✅ שחזרתי אותו, החלתי את כל 3 המיגרציות (init/billing/events), הטבלאות + ה-`plans` מאוכלסים.
- ✅ אני שולט בו מלא דרך ה-MCP → billing/events כבר לא חסומים, ואני יכול להמשיך לבד.
- ⚠️ **המחיר:** akfg היה ריק. אם ב-hbsgz יש משתמשים/מידע אמיתי — הוא **לא** עובר. בהנחה
  שאנחנו לפני בטא, כנראה אין מה להעביר. **אם יש מידע אמיתי ב-hbsgz — עצור ותגיד לי לפני שתחליף.**

## צעדים — רק אתה יכול (Vercel אין לי הרשאת כתיבת env דרך MCP)

### א. ערכי החיבור של akfg
- `NEXT_PUBLIC_SUPABASE_URL` = `https://akfgudspliyymiysajoh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase → פרויקט akfg → **Settings → API → Project API keys → `anon` `public`** (העתק).
- `SUPABASE_SERVICE_ROLE_KEY` = אותו מסך → **`service_role` `secret`** (העתק; **סודי** — רק ל-server).

### ב. הזרקה ל-Vercel (פרויקט שמשרת `countmedemo.vercel.app`)
1. Vercel → הפרויקט → **Settings → Environment Variables**.
2. הוסף/עדכן את שלושת המשתנים מ-(א) ל-**Production** (וגם Preview אם בודקים שם).
3. ודא ש-`SUPABASE_SERVICE_ROLE_KEY` **לא** מסומן Expose ל-browser ואינו `NEXT_PUBLIC_*`.
4. **Redeploy** (Deployments → … → Redeploy) כדי שה-env ייכנס.

### ג. Google OAuth על akfg
ראה `oauth-branding.md` — צריך להגדיר את ה-Google provider + Redirect URLs על **akfg**
(הם לא קיימים שם עדיין כי הוא חדש). זה מתלבש על אותה כניסה לקונסולות של מיתוג ה-OAuth.

## אימות (אני אריץ ברגע שתאשר את ה-MCP prompts)
- `list_tables(akfg)` → 12 טבלאות; `get_advisors(akfg, security)` → אין פערי RLS.
- אחרי שתזריק env + redeploy: התחברות Google → profile נוצר אוטומטית (trigger) → persona נשמר ב-DB.

## למה אני לא יכול לעשות את ב' לבד
ל-Vercel MCP אין כלי לכתיבת Environment Variables (יש רק קריאה/deploy). לכן הזרקת המפתחות
היא צעד שחייב להיעשות על ידך. ברגע שתסיים — אני מאמת מהצד שלי וממשיך.
