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
> מבוסס על בדיקת המגבלות (יוני/Gemini, 2026-06-19). הלייב הנוכחי: `https://countmedemo.vercel.app`.

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

## ✅ שלב 2 — Supabase Auth על פרויקט **akfgudspliyymiysajoh** (אפשר עכשיו)

> חשוב: מבצעים את זה על הפרויקט **akfg** (ה-backend שאליו אנחנו מתחברים — ראו
> `connect-supabase-akfg.md`), לא על hbsgz.

1. **Authentication → URL Configuration:**
   - **Site URL** = `https://countmedemo.vercel.app`
   - **Redirect URLs** = הוסף `https://countmedemo.vercel.app/auth/callback`
     ו-`http://localhost:3000/auth/callback` (לפיתוח).
2. **Authentication → Providers → Google:** הזן **Client ID + Client Secret** מאותו פרויקט Google
   של שלב 1 (חייב להיות אותו פרויקט). ב-Google Cloud → Credentials → OAuth client →
   **Authorized redirect URI** = `https://akfgudspliyymiysajoh.supabase.co/auth/v1/callback`.

## ⛔ שלב 3 — להעלים את ה-`supabase.co` הקטן (דחוי, לא חינמי)

- מתחת ל-"להמשיך אל CountMe" עדיין יופיע בקטן `akfgudspliyymiysajoh.supabase.co`. כדי להסיר אותו
  לגמרי צריך **Supabase Custom Domain** — פיצ'ר של תוכנית **Pro (~$25/חודש)** + דומיין אמיתי עם
  שליטה ב-DNS (אי אפשר על `vercel.app`).
- **המלצה:** לקראת השקה מלאה לקנות דומיין (`countme.co.il`/`countme.ai`, עשרות שקלים בשנה),
  לחבר אותו **חינם** ל-Vercel — וזה פותר גם את מעבר ה-Production בגוגל. רק העלמת ה-`supabase.co`
  הקטן תדרוש את שדרוג ה-Supabase Pro.

## אימות
- גלישה נקייה → `/login` → "התחברות עם Google" → במסך ההסכמה: **"להמשיך אל CountMe"**
  (עם `supabase.co` קטן מתחת — תקין לבטא) → חזרה ל-`/auth/callback` → נחיתה על `/home`.

## שורה תחתונה
שלב 1 (בלי לוגו, Testing + test users) + שלב 2 (עם `countmedemo.vercel.app`) = הכותרת
"להמשיך אל CountMe" עכשיו, בחינם. שלב 3 דחוי לרכישת דומיין/Pro.
