---
title: מסך ההסכמה של Google — "להמשיך אל CountMe"
type: launch / config (פעולה ידנית של יוני בקונסולות)
created: 2026-06-17
updated: 2026-06-19
---

# שיוני: לגרום למסך ההתחברות של Google להראות "CountMe"

**המטרה:** במסך ההסכמה של Google יופיע **"להמשיך אל CountMe"** במקום טקסט ארוך
(`להמשיך אל <ref>.supabase.co`).

**למה זה לא בקוד:** הקוד תקין (`signInWithOAuth` עם `redirectTo = origin + /auth/callback`,
וה-callback מכבד את ה-host דרך `x-forwarded-host` — עובד עם כל דומיין). הטקסט נקבע
בשתי קונסולות בלבד: (1) **App name** ב-Google OAuth consent screen, (2) **המארח** של ה-redirect.

> **מותאם למצב שלנו: Vercel חינמי + בלי דומיין משלנו עדיין + Supabase Free.**
> מבוסס על בדיקת המגבלות (יוני/Gemini, 2026-06-19). הלייב הנוכחי: `https://countmedemo-eight.vercel.app`
> (**תוקן 05/08** — המסמך הזה הפנה בטעות ל-`countmedemo.vercel.app`, שאינו domain רשום על אף
> פרויקט Vercel בחשבון; אומת מול Vercel API. ראה `memory/decisions.md`).

---

## ✅ שלב 1 — Google Cloud Console (אפשר עכשיו, פותר ~80% מהמראה)

1. [console.cloud.google.com](https://console.cloud.google.com) → הפרויקט של countme →
   **APIs & Services → OAuth consent screen**.
2. **App name = `CountMe`** ← זה הטקסט ב"להמשיך אל…". זה השינוי המשמעותי.
3. **User support email** = המייל של הפרויקט.
4. **אל תעלה לוגו כרגע.** העלאת לוגו מפעילה תהליך **Brand Verification** ידני ומחמיר של
   גוגל, שנחסם בלי דומיין קנוי + מייל ארגוני. בלי לוגו — השם `CountMe` עדיין מופיע בטקסט גדול.
   *(הערה של יוני: "יש כבר לוגו" — אם כבר מופיע לוגו במסך, כנראה הוא הועלה בעבר/האפליקציה כבר
   עברה אימות מותג. אם כן — מצוין, אין צורך לגעת; רק ודא ש-App name = CountMe. צלם מסך ואראה לך.)*
5. **השאר את האפליקציה במצב `Testing`** (לא Production). ב-Testing אפשר עד **100 משתמשי בדיקה** —
   מושלם לבטא של 50 חברים. תחת **Test users** הוסף ידנית את כתובות המייל של החברים שיתחברו.
   - *למה לא Production:* גוגל לא תאשר מעבר ל-Production עם דומיין משותף כמו `vercel.app`
     (דורש Top-Level Domain מאומת ב-Search Console). זה לשלב ההשקה המלאה, לא לבטא.

## ✅ שלב 2 — Supabase Auth על פרויקט **hbsgzelipeawkvtcazdr** (אפשר עכשיו)

> **תיקון 2026-07-25:** הגרסה הקודמת של המסמך הזה הפנתה לפרויקט `akfgudspliyymiysajoh`
> ("akfg"). התברר שזה היה חיבור שגוי של כלי ה-MCP לחשבון Supabase לא נכון — הפרויקט
> הלייב האמיתי, המתועד ב-`memory/decisions.md`, הוא **`hbsgzelipeawkvtcazdr`** ("hbsgz").
> קובץ `connect-supabase-akfg.md` הוסר; ראו `connect-supabase-hbsgz.md`. אם ביצעת בעבר
> את השלבים למטה מול akfg — הם לא השפיעו על הפרודקשן האמיתי ויש לחזור עליהם מול hbsgz.

1. **Authentication → URL Configuration:**
   - **Site URL** = `https://countmedemo-eight.vercel.app`
   - **Redirect URLs** = הוסף `https://countmedemo-eight.vercel.app/auth/callback`
     ו-`http://localhost:3000/auth/callback` (לפיתוח).
2. **Authentication → Providers → Google:** הזן **Client ID + Client Secret** מאותו פרויקט Google
   של שלב 1 (חייב להיות אותו פרויקט). ב-Google Cloud → Credentials → OAuth client →
   **Authorized redirect URI** = `https://hbsgzelipeawkvtcazdr.supabase.co/auth/v1/callback`.

## ⚠️ פער חדש שנחשף 23/08 — Preview deployments לא עובדים ב-OAuth בכלל

**מה קרה:** `/setup` הוגן מאחורי אימות (23/08 — ראו `memory/decisions.md`). QA (Claude in
Chrome) שניסה להתחבר דרך Google **מתוך כתובת ה-preview** של branch
(`countmedemo-git-claude-tomi-onboar-76de30-yonilev2003s-projects.vercel.app`) גילה: לחיצה על
"התחברות עם Google" **לא חוזרת ל-preview** — הדפדפן נוחת בפועל על `countmedemo-eight.vercel.app`
(ה-**production**), וגלישה חוזרת ל-`/setup` ב-preview עצמה, גם אחרי השלמת ה-OAuth, ממשיכה
להפנות ל-`/login` — כלומר **אין דרך להתחבר ולהשתמש באשף על שום preview deployment היום**.

**הסיבה (לא באג בקוד — הקוד תקין, ראו למעלה "למה זה לא בקוד"):** רשימת ה-Redirect URLs בשלב 2
למעלה כוללת **רק** `countmedemo-eight.vercel.app` ו-`localhost:3000`. Supabase דוחה/מתעלם
מ-`redirectTo` שלא ברשימה הזו ונופל בחזרה ל-Site URL (production) — בדיוק ההתנהגות שנצפתה.
זה היה קיים תמיד, פשוט לא נחשף לפני 23/08 כי אף אחד לא ניסה Google מ-preview לפני ש-/setup
דרש אימות.

**התיקון (פעולה ידנית של יוני ב-Supabase Dashboard, לא בקוד):**

באותו מסך "Authentication → URL Configuration → Redirect URLs" (שלב 2 למעלה), הוסף אחת מהשתיים:

- **מינימלי, לענף הזה בלבד:**
  `https://countmedemo-git-claude-tomi-onboar-76de30-yonilev2003s-projects.vercel.app/auth/callback`
- **עמיד יותר, לכל preview עתידי בפרויקט (Supabase תומך ב-wildcard ב-Redirect URLs):**
  `https://countmedemo-*-yonilev2003s-projects.vercel.app/auth/callback`

מומלץ הפתרון השני — כל branch עתידי יעבוד בלי לחזור לכאן שוב. **עד שהשדה הזה מתעדכן, כל בדיקת
OAuth חייבת לרוץ מול `countmedemo-eight.vercel.app` (production) בלבד**, לא מול preview.

## ⛔ שלב 3 — להעלים את ה-`supabase.co` הקטן (דחוי, לא חינמי)

- מתחת ל-"להמשיך אל CountMe" עדיין יופיע בקטן `akfgudspliyymiysajoh.supabase.co`. כדי להסיר אותו
  לגמרי צריך **Supabase Custom Domain** — פיצ'ר של תוכנית **Pro (~$25/חודש)** + דומיין אמיתי עם
  שליטה ב-DNS (אי אפשר על `vercel.app`).
- **המלצה:** לקראת השקה מלאה לקנות דומיין (`countme.co.il`/`countme.ai`, עשרות שקלים בשנה),
  לחבר אותו **חינם** ל-Vercel — וזה פותר גם את מעבר ה-Production בגוגל. רק העלמת ה-`supabase.co`
  הקטן תדרוש את שדרוג ה-Supabase Pro.

## אימות
- גלישה נקייה → `/login` → "התחברות עם Google" → במסך ההסכמה: **"להמשיך אל CountMe"**
  (עם `supabase.co` קטן מתחת — תקין לבטא) → חזרה ל-`/auth/callback` → נחיתה על `/dashboard`.

## שורה תחתונה
שלב 1 (בלי לוגו, Testing + test users) + שלב 2 (עם `countmedemo-eight.vercel.app`) = הכותרת
"להמשיך אל CountMe" עכשיו, בחינם. שלב 3 דחוי לרכישת דומיין/Pro.
