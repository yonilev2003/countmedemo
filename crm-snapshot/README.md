# countme-crm

מערכת CRM פנימית של צוות countme. צ'אט, אנשי קשר, משימות עם גאנט, מסמכים ויומן עם סנכרון Google Calendar. עברית, RTL, Heebo.

מבוסס על Next.js 16 + React 19 + TypeScript + Tailwind 4 + Supabase + Anthropic SDK.

## הרצה לוקלית

```bash
npm install
cp .env.template .env.local
# מלא את הערכים ב-.env.local
npm run dev
# פתוח על http://localhost:3000
```

## Setup לפני הרצה ראשונה

יש 4 שירותי צד-שלישי שצריך לחבר. כולם חינמיים ל-tier הראשוני.

### 1. Supabase

1. צור פרויקט ב-[Supabase](https://supabase.com) (region: `eu-central-1` או `eu-west-1`)
2. ב-`Project Settings → API` העתק את:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (צד שרת בלבד!)
3. ב-`SQL Editor` הרץ את כל קבצי ה-migrations מ-`supabase/migrations/` בסדר עולה
4. ב-`Authentication → Providers` הפעל Google (פרטי OAuth מסעיף 3)
5. ב-`Storage` צור 2 buckets:
   - `documents` (private) — לקבצים מצורפים למסמכים ולצ'אט
   - `gantt-uploads` (private) — לקבצי גאנט שעלו

### 2. Google OAuth + Calendar API

1. צור פרויקט ב-[Google Cloud Console](https://console.cloud.google.com)
2. הפעל את `Google Calendar API` ב-`APIs & Services → Library`
3. ב-`APIs & Services → OAuth consent screen` הגדר:
   - User Type: External
   - Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.events`
4. ב-`Credentials → Create OAuth client ID` (Web application):
   - Authorized redirect URIs:
     - `https://<your-supabase>.supabase.co/auth/v1/callback` (להתחברות)
     - `http://localhost:3000/api/calendar/google/callback` (לסנכרון יומן בפיתוח)
     - `<NEXT_PUBLIC_APP_URL>/api/calendar/google/callback` (לסנכרון יומן בפרודקשן)
5. העתק `Client ID` ו-`Client Secret` ל-env vars
6. ב-Supabase Dashboard, `Authentication → Providers → Google`: הזן את אותם Client ID/Secret

### 3. Anthropic

1. צור חשבון ב-[Anthropic Console](https://console.anthropic.com)
2. צור API key → `ANTHROPIC_API_KEY`

### 4. Resend (מיילי הזמנות)

1. צור חשבון ב-[Resend](https://resend.com)
2. צור API key → `RESEND_API_KEY`
3. אופציונלי: אמת domain (אחרת תשלח מ-`onboarding@resend.dev` בלבד)

## דיפלוי ל-Vercel

1. צור פרויקט Vercel חדש בשם `countme-crm`, חבר לריפו ב-GitHub
2. ב-`Settings → Environment Variables` הוסף את כל המשתנים מ-`.env.template`
3. עדכן את `NEXT_PUBLIC_APP_URL` לכתובת הפרודקשן
4. עדכן ב-Google Cloud את ה-redirect URI לכתובת הפרודקשן
5. דיפלוי

## הוראות פיתוח

### Git workflow

- `main` — פרודקשן
- `claude/<short-name>` — עבודה בעזרת AI
- `feat/<short-name>` — פיצ'ר ידני
- `fix/<bug>` — תיקון

לפני push: `npm run build` + `npm run typecheck`.

### env hygiene

כל variable שמתווסף ל-`.env.local` חייב להופיע גם ב-`.env.template` עם value ריק ותיאור. ה-template הוא התיעוד.

### Code conventions

- קוד באנגלית, תוכן בעברית
- RTL ברירת מחדל (`<html dir="rtl">` ב-layout)
- Tailwind 4 — ה-theme מוגדר ב-`globals.css` עם `@theme`
- shadcn-style UI components ב-`src/components/ui/`
- Supabase clients: `src/lib/supabase/{client,server,admin}.ts`

## ארכיטקטורה

ראה `docs/ARCHITECTURE.md` למבנה מפורט של המודל, RLS, וזרימת הנתונים.

## רישיון

Private. כל הזכויות שמורות ל-countme.
