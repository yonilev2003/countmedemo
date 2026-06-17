---
title: מסך ההסכמה של Google — "להמשיך אל CountMe"
type: launch / config (פעולה ידנית של יוני)
created: 2026-06-17
---

# שיוני: לגרום למסך ההתחברות של Google להראות "CountMe" ולא טקסט ארוך

**הבעיה (כפי שיוני תיאר):** במסך ההסכמה של Google כתוב טקסט ארוך/מכוער (למשל
`להמשיך אל <ref>.supabase.co`) במקום פשוט **"להמשיך אל CountMe"**.

**הסיבה:** הטקסט הזה מורכב משני דברים שאינם בקוד שלנו אלא בקונסולות:
1. **שם האפליקציה במסך ההסכמה של Google** (Google Cloud OAuth consent screen).
2. **המארח (host) של ה-redirect** — כרגע `xxxx.supabase.co` של Supabase.

הקוד שלנו כבר תקין (`signInWithOAuth` עם `redirectTo = origin + /auth/callback`).
מה שנשאר הוא **הגדרות בקונסולות — פעולה ידנית של יוני**:

## שלב 1 — Google Cloud Console (שם + לוגו)
1. כניסה ל-[console.cloud.google.com](https://console.cloud.google.com) → הפרויקט של countme.
2. **APIs & Services → OAuth consent screen**.
3. **App name** = `CountMe` (זה הטקסט שמופיע ב"להמשיך אל…").
4. **User support email** = המייל של הפרויקט.
5. **App logo** = הלוגו של countme (≤ 1MB; מאיץ אימות מותג).
6. **Authorized domains** = הדומיין של countme (ראו שלב 2).
7. שמירה. אם האפליקציה ב-Testing — להוסיף את כתובות הבטא תחת **Test users**, או לפרסם (Publish) לפני פתיחה ל-50 חברים.

## שלב 2 — Supabase Auth (המארח של ה-redirect)
כדי שיופיע דומיין של countme ולא `xxxx.supabase.co`:
1. **Supabase → Authentication → URL Configuration:**
   - **Site URL** = הדומיין הציבורי (למשל `https://app.countme.co.il` או `https://countmedemo-eight.vercel.app`).
   - **Redirect URLs** = להוסיף `https://<דומיין>/auth/callback` (+ `http://localhost:3000/auth/callback` לפיתוח).
2. **(מומלץ) Custom Domain** ל-Auth (Supabase → Settings → Custom Domains): מגדיר מארח משלנו ל-GoTrue, כך ש-Google מציג דומיין countme במקום `*.supabase.co`. דורש רשומת DNS + (בחלק מהתוכניות) תשלום.
3. **Google provider** (Authentication → Providers → Google): להזין Client ID + Client Secret מאותו פרויקט Google של שלב 1 (חייב להיות אותו פרויקט, אחרת השם לא יתאים).

## אימות
- במצב גלישה נקי → `/login` → "התחברות עם Google" → במסך ההסכמה צריך להופיע **"להמשיך אל CountMe"** עם הלוגו, ואז חזרה ל-`/auth/callback` → נחיתה על `/home`.

## תלות
- **חוסם חיצוני קל:** שלב 2 (Custom Domain) דורש דומיין מאומת. אם אין עדיין דומיין countme, שם-האפליקציה (שלב 1) לבדו כבר משפר משמעותית את הטקסט; ה-Custom Domain מסיר את שארית ה-`supabase.co`.
- אין שינוי קוד נדרש מעבר למה שכבר קיים; הכול קונפיגורציה.
