---
title: מוכנות ל-Capacitor — ביקורת APIs + צ'קליסט לסקאפולד
type: mobile / readiness audit (לא סקאפולד — רק תיעוד+ביקורת)
created: 2026-08-18
related: memory/decisions.md (סשן 18/08 ערב — "אפליקציה נייטיבית: Capacitor — שתי החנויות")
---

# מוכנות ל-Capacitor — ביקורת + צ'קליסט לסשן הסקאפולד

**רקע:** יוני נעל (18/08) — הפצה נייטיבית = **Capacitor**, **שתי החנויות** (Android + iOS)
במקביל, במקום ברירת-המחדל הרכה מ-19/07 ("PWA+Play קודם, iOS נדחה"). ההחלטה **נעולה אך
revisitable**. בסבב-הבטא הנוכחי: **רק תיעוד + ביקורת browser-only APIs** — לא סקאפולד. סשן
ייעודי נפרד יריץ `npx cap init` / `capacitor.config` / `ios/` / `android/`.

מסמך זה נועד לכך שהסשן הייעודי יתחיל מהר: כל ה-recon כבר בוצע, מאומת מול הקוד עם `file:line`,
ולא צריך "לגלות" שוב מה הכתובת הרגישה בקוד.

**קביעה מרכזית:** מומלץ מצב **"remote URL"** של Capacitor — ה-WebView טוען את
`https://countmedemo-eight.vercel.app` החי (לא build מקומי/bundled), ולא build סטטי מקומי.
הנימוק וההשלכות בסעיף 1.7.

---

## 1. מלאי APIs שדורשים תשומת-לב בתוך WebView של Capacitor

### 1.1 Web Speech API (הכתבה קולית לחשבוניות)

**קובץ:** `src/app/invoices/new/page.tsx` (שורות 67–136, בלוק "Minimal types for the Web Speech
API — TS lib.dom doesn't ship them").

```ts
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
function getRecognitionCtor(): SpeechRecognitionCtor | null {
  ...
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
...
useEffect(() => { setVoiceSupported(getRecognitionCtor() !== null); }, []);
```

- **הבעיה:** לא Android WebView (System WebView) ולא iOS WKWebView מממשים את
  `SpeechRecognition`/`webkitSpeechRecognition` (זה API של Chrome/Safari **כדפדפן עצמאי**, לא של
  מנוע ה-WebView המוטמע). בפועל `getRecognitionCtor()` יחזיר `null` בשני הפלטפורמות בתוך
  Capacitor — **לא קריסה**, כי הקוד כבר מגן על עצמו יפה (`voiceSupported` נופל ל-`false` ומסתיר
  את כפתור ההכתבה) — אבל התכונה **תיעלם בשקט** מהאפליקציה הנייטיבית בלי שאף אחד יזהה את זה בבדיקה
  שטחית.
- **פתרון לטווח קצר (סבב הסקאפולד):** לתעד את זה כמגבלה ידועה, לא לתקן — התכונה עדיין עובדת
  בדפדפן/PWA.
- **פתרון לטווח ארוך (backlog נפרד, לא בסקאפולד הראשוני):** תוסף נייטיבי כמו
  `@capacitor-community/speech-recognition` (עוטף `SFSpeechRecognizer`/`Speech-to-Text` הנייטיביים),
  עם fallback ל-Web Speech API כש-`Capacitor.isNativePlatform() === false` (דפדפן רגיל/PWA
  ממשיכים לעבוד כמו היום).

### 1.2 Service Worker (`public/sw.js`) + Web App Manifest (`public/manifest.json`)

**קבצים:** `public/sw.js`, `public/manifest.json`, `src/components/service-worker.tsx`
(רישום ב-`useEffect` דרך `navigator.serviceWorker.register("/sw.js")`), מוטען מ-`layout.tsx`
עבור **כל** עמוד.

- **מה זה עושה היום:** network-first עם ניקוי-כל-המטמונים הישנים ב-`activate` (cache בשם
  `countme-v2`) — נבנה במפורש כדי שכל deploy ב-Vercel ייראה מיידית למשתמשים חוזרים (ראה ההערה
  בראש `sw.js`).
- **הבעיה בתוך Capacitor:** Service Worker + manifest.json הם מנגנון ההתקנה/עדכון של **PWA
  בדפדפן**. Capacitor **לא קורא את `manifest.json` בכלל** — האייקון/שם/splash הנייטיביים מגיעים
  מ-`capacitor.config` ומתיקיות `ios/`/`android/` הנפרדות. במצב "remote URL" (המומלץ, ראה 1.7)
  ה-WebView עדיין דפדפן-כמו-דפדפן מבחינת ה-origin שהוא טוען, אז `navigator.serviceWorker` כן
  קיים וה-SW **כן ירשם** — מה שיוצר עוד שכבת-מטמון-רשת מיותרת ומקור-כשל נוסף (אם ה-SW נתקע/נכשל)
  בתוך אפליקציה שכבר עברה store review, בלי שום דרך למשתמש "לנקות cache" כמו בדפדפן.
- **המלצה (להכריע בסשן הסקאפולד, לא כאן):** בדוק `Capacitor.isNativePlatform()` ב-
  `service-worker.tsx` ואל תרשום SW כשרץ בתוך Capacitor — ה-origin החי כבר network-first
  ב-Vercel, וה-SW לא מוסיף ערך בתוך shell נייטיבי, רק סיכון. `manifest.json` עצמו יכול להישאר
  ללא שינוי — הוא משרת את ערוץ ה-PWA/דפדפן בנפרד, Capacitor פשוט מתעלם ממנו.

### 1.3 `window.location`/`origin` בזרימת ה-OAuth — **הדגל האדום המרכזי של המסמך**

**קבצים:**
- `src/app/login/login-form.tsx` — בונה `redirectTo: `${window.location.origin}/auth/callback...`
  ומפעיל `supabase.auth.signInWithOAuth({ provider: "google", ... })`.
- `src/app/auth/callback/route.ts` — מקבל את ה-`code`, מחליף session, ומפנה הלאה לפי
  `x-forwarded-host`/`origin`.

**שתי בעיות נפרדות, לא אחת:**

1. **Google חוסם OAuth מתוך WebView מוטמע, לא משנה איזה origin נטען.** מדיניות Google (מ-2016,
   עדיין באכיפה) מזהה WebView לפי User-Agent ומחזירה שגיאת `disallowed_useragent`
   ("This browser or app may not be secure") — **בין אם ה-WebView טוען דף מקומי ובין אם הוא טוען
   את ה-origin החי מ-Vercel (remote URL)**. הבעיה היא ה-WebView עצמו, לא התוכן שבתוכו. כלומר:
   מעבר ל-"remote URL" mode (סעיף 1.7) **לא פותר** את זה — זו בעיה נפרדת שדורשת פתרון נפרד.
   - **הפתרון הנדרש:** להריץ את זרימת ה-Google OAuth דרך דפדפן-מערכת/in-app-browser אמיתי
     (`SFSafariViewController` ב-iOS / Chrome Custom Tabs ב-Android — לא ה-WebView של
     Capacitor עצמו), כלומר תוסף `@capacitor/browser` (`Browser.open()`), **לא** ניווט רגיל
     בתוך ה-WebView הראשי.
   - זה דורש דרך-חזרה מהדפדפן-החיצוני **אל תוך** האפליקציה: Universal Links (iOS) / App Links
     (Android) על `/auth/callback`, כדי שכשה-OAuth מסיים והדפדפן-החיצוני מנווט ל-
     `https://.../auth/callback?code=...`, המערכת תפתח את זה **חזרה** באפליקציה (לא תישאר
     בדפדפן החיצוני). דורש קובצי אימות דומיין (`apple-app-site-association`,
     `assetlinks.json`) בשורש הדומיין — לא קיימים היום, צריך ליצור בסשן הסקאפולד.
   - ל-Supabase יש allowlist נפרד ל-redirect URLs ("Redirect URLs" בהגדרות ה-Auth) — צריך
     להוסיף שם את סכימת ה-deep-link/ה-Universal-Link המתאימה לפני שזה יעבוד.
2. **`window.location.origin` עצמו יעבוד נכון רק במצב remote-URL.** אם בעתיד יוחלט על bundled
   build מקומי (טעון מ-`capacitor://localhost` או סכימה מותאמת), `window.location.origin` יחזיר
   את הסכימה המקומית הזאת — לא `https://countmedemo-eight.vercel.app` — ו-`redirectTo` שנבנה
   ממנו יישבר (וגם לא יהיה URL חוקי מבחינת Google OAuth ממילא, ראה סעיף 1.7). זו עוד סיבה
   התומכת ב-remote-URL mode: קוד ה-`redirectTo` הקיים ממשיך לעבוד **ללא שינוי** רק במצב הזה.

**מנגנון קיים שכבר עוזר כאן, לא צריך לבנות מחדש:** `setup-storage.ts`'s
`consumeExplicitContinueIntent()` כבר משלב `sessionStorage` (scoped לטאב) + query-param
fallback, בדיוק כי מנגנון ה-18/08 (משוב-רוי, task #2) כבר זיהה ש"ה-OAuth round-trip של Google
לפעמים משלים בטאב/הקשר אחר (דפדפנים ניידים שעוברים ל-in-app browser)". תבנית ה-`@capacitor/browser`
שתוארה למעלה **תמיד** (לא "לפעמים") תרוץ בהקשר-דפדפן נפרד מה-WebView — כלומר ה-query-param
fallback הקיים הוא בדיוק המנגנון הדרוש כבר עובד, ולא צריך מנגנון חדש בשביל זה. תיעוד השורה
הרלוונטית: `src/lib/setup-storage.ts`, הבלוק סביב `CONTINUE_INTENT_QUERY_PARAM`.

### 1.4 localStorage / sessionStorage — סמנטיקת התמדה

**קבצים עיקריים:** `src/lib/setup-storage.ts` (מטמון פרסונה + `owner` stamp),
`src/lib/data/persona-store.ts`, `src/lib/data/use-persona.ts`/`use-required-persona.ts`,
`src/lib/expenses/store.ts`, `src/lib/a11y/store.ts`.

- localStorage/sessionStorage **קיימים** ב-Capacitor WebView (גם WKWebView וגם Android
  System WebView) ונשמרים בתוך container האפליקציה — לא זהה 1:1 לפרופיל-דפדפן "אמיתי" אבל
  בפועל יציב מספיק לשימוש רגיל (לא נמחק בין הרצות, רק אם המשתמש מוחק את האפליקציה/מנקה
  אחסון-מכשיר).
- **הסיכון היחיד שכבר מתועד בקוד (`setup-storage.ts`) רלוונטי ישירות ל-Capacitor:** ה-
  `sessionStorage`-based `CONTINUE_INTENT_KEY` הוא scoped-לטאב, ולכן "נופל" בכל זרימת OAuth
  שעוברת דרך in-app-browser נפרד (בדיוק תבנית ה-`@capacitor/browser` מ-1.3). כפי שצוין למעלה —
  זה כבר מכוסה ע"י ה-query-param fallback הקיים; אין כאן עבודה חדשה, רק אימות מפורש בסשן
  הסקאפולד שהזרימה עדיין נכונה end-to-end עם דפדפן-חיצוני אמיתי (לא רק "טאב אחר" כמו שנבדק
  ב-18/08).
- persona ב-localStorage היא **מטמון בלבד** — Supabase (`profiles.persona` + טבלאות מנורמלות)
  הוא מקור-האמת (`memory/decisions.md`, "localStorage נשאר cache"). כלומר גם אם אחסון-המכשיר
  מתאפס (למשל התקנה-מחדש של האפליקציה), אין אובדן-נתונים אמיתי למשתמש מחובר — רק צריך
  reconcile מול ה-DB, שכבר קיים.
- Supabase browser client (`src/lib/supabase/client.ts`, `createBrowserClient`) מ-`@supabase/ssr`
  משתמש בעיקר ב-**cookies** לסשן (לא localStorage) — טוב עבור Capacitor, כי cookies שנשלחים
  ל-domain אמיתי דרך HTTPS מתנהגים עקבי יותר בין ניווטים/רענון מאשר localStorage גולמי.

### 1.5 CSP + Permissions-Policy — `next.config.ts`

**קובץ:** `next.config.ts` (הבלוק `securityHeaders`).

```
key: "Permissions-Policy",
value: "camera=(), microphone=(self), geolocation=()",
```

- `camera=()` **חוסם `getUserMedia` למצלמה לגמרי**, לכל origin כולל `self`. `microphone=(self)`
  מאפשר מיקרופון ל-same-origin בלבד (בשביל Web Speech API בהכתבה הקולית, סעיף 1.1).
- **אינטראקציה עם `capture=` הקיים:** `src/app/expenses/new/page.tsx:573` משתמש ב-
  `<input type="file" capture="environment">` לצילום קבלה. תכונת `capture` על `<input>`
  **לא עוברת דרך `getUserMedia`/Permissions-Policy בכלל** — היא מאצילה ל-UI מצלמה נייטיבי של
  ה-OS (picker), בדיוק כמו שדה-קובץ רגיל. כלומר: **הזרימה הקיימת היום ממשיכה לעבוד ללא שינוי**
  גם עם `camera=()`, גם בדפדפן וגם בתוך Capacitor WebView — אין כאן חסימה בפועל.
- **אינטראקציה עם תוסף-מצלמה נייטיבי עתידי:** אם/כש-`@capacitor/camera` (או תוסף סריקת-ברקוד
  שדורש preview חי דרך JS/`getUserMedia`) ייכנס, זה **כן** ידרוש שינוי ל-`camera=(self)` —
  בדיוק כמו שכבר נעשה עבור המיקרופון. תוסף Capacitor "טהור" (native bridge, לא web camera
  API) לא מושפע מ-Permissions-Policy כלל (הוא לא רץ דרך ה-WebView's media permissions), אבל
  כל שימוש עתידי ב-`getUserMedia`/`<video>` בתוך ה-JS עצמו כן ידרוש את השינוי הזה. **מסקנה:**
  אין פעולה נדרשת עכשיו — רק לזכור לעדכן את השורה הזאת אם ייבנה preview-מצלמה מבוסס-web.
- ה-CSP (`connect-src 'self' https://*.supabase.co wss://*.supabase.co https://boi.org.il
  https://www.boi.org.il`) עדיין `Report-Only` (לא אוכף) — ראה TODO קיים ב-`next.config.ts`
  לגבי nonces/strict-dynamic לפני אכיפה. תחת remote-URL mode (1.7) ה-headers האלה ממשיכים
  לחול בדיוק כמו בדפדפן רגיל, כי הם מגיעים מאותו שרת Vercel שה-WebView טוען — שוב תומך
  ב-remote-URL כבחירה הפשוטה יותר.

### 1.6 Fetch ל-hosts חיצוניים

- **`src/lib/expenses/boi-exchange-rate.ts`** — `fetchBoiRate()` קורא ישירות **מהלקוח**
  (מיובא ומופעל מ-`src/app/expenses/new/page.tsx:157`, קומפוננטת `"use client"`) ל-
  `https://boi.org.il/PublicApi/GetExchangeRate`. תחת remote-URL Capacitor זה מתנהג זהה
  לדפדפן רגיל — אותו CORS/ATS (App Transport Security ב-iOS דורש HTTPS, וזה כבר HTTPS).
  אין השפעה חדשה של Capacitor כאן; כל סיכון (כמו חוסר-ודאות סביב שמות-השדות ב-JSON, כבר
  מתועד בהערת הקובץ) קיים גם היום בדפדפן.
- **`src/lib/regulatory/sources.ts`** (gov.il, knesset.gov.il, icpas.org.il) — **שרת-בלבד**,
  מיובא רק מ-`scripts/regulatory-watch/run.ts`/`cross-ref.ts` (CLI/cron script, לא חלק מה-
  bundle של האפליקציה). **לא רלוונטי ל-WebView בכלל** — לא צריך CSP entry, לא צריך flag.
- `src/lib/analytics/track-client.ts` ו-שאר קריאות ה-`fetch("/api/...")` (chat, coach,
  upload, parse-invoice, parse-expense, doc-link, billing/checkout) — כולן **same-origin**
  יחסית ל-origin שה-WebView טוען (Vercel), כלומר עובדות ללא שינוי תחת remote-URL mode.

### 1.7 מודל ההגשה: Next.js-on-Vercel מול מצבי Capacitor

Capacitor תומך בשני מצבים עיקריים:

| מצב | איך זה עובד | האם מתאים ל-countme |
|---|---|---|
| **Bundled (מקומי)** | `webDir` מכיל build סטטי (`next export`), נטען מ-`capacitor://localhost` | **לא מתאים.** האפליקציה תלויה ב-API routes בשרת (`/api/chat`, `/api/coach`, `/api/upload`, `/api/parse-invoice`, `/api/billing/*`, `/auth/callback`, ה-`proxy.ts` שמרענן session cookies) — כל אלה Server Components/Route Handlers שדורשים ריצה על Vercel, לא ניתנים ל-`next export` סטטי. גם ה-`redirectTo`/OAuth (1.3) נשען על `window.location.origin` להיות origin אמיתי. |
| **Remote URL (מומלץ)** | `capacitor.config` מצביע ל-`server.url: "https://countmedemo-eight.vercel.app"`, ה-WebView פשוט טוען את זה כמו טאב | **מתאים.** כל ה-API routes, ה-`proxy.ts`, ה-CSP headers, וזרימת ה-OAuth (מלבד בעיית ה-WebView-block מ-1.3, שקיימת בשני המצבים) ממשיכים לעבוד כמו בדפדפן — אין build נפרד לתחזק, כל deploy ל-`main` מגיע מיידית לאפליקציות הנייטיביות בלי עדכון-חנות. |

**השלכת store-review של remote-URL mode (חשוב לדעת לפני שמגישים לחנויות):**
- **Apple (App Store):** אפליקציות "עטיפת-WebView-לאתר" בלי ערך נייטיבי מוסף נדחות היסטורית
  לפי Guideline 4.2 ("Minimum Functionality") — Apple דורש שהאפליקציה תרגיש כמו אפליקציה, לא
  אתר בכיסוי. Capacitor **כן** נחשב לגיטימי (זה לא UIWebView/WKWebView חד-פעמי גנרי — זו
  פלטפורמה מוכרת עם תוספים נייטיביים אמיתיים), אבל כדי לעבור review כדאי ש-App יציג לפחות
  פונקציונליות נייטיבית אמיתית (push notifications, share sheet, haptics, deep links) ולא
  להיראות כמו "אתר בתוך מסגרת" גרידא. שווה לתכנן לפחות תוסף-נייטיבי אחד אמיתי (למשל
  Push Notifications לתזכורות-דדליין, שכבר יש להן לוגיקה ב-`lib/deadlines`) לפני הגשה.
- **Google Play:** פחות נוקשה מ-Apple לגבי "web wrapper", אבל גם שם יש מדיניות נגד
  "Repetitive/functionally-identical apps" ומצפה למינימום-פונקציונליות. remote-URL app
  שעוברת בהצלחה היום ברוב המקרים, בתנאי שיש ערך נייטיבי אמיתי (offline handling הגיוני,
  push, וכו').
- **שני הפלטפורמות:** review מצפה גם למסך privacy policy/EULA נגיש בתוך האפליקציה (יש כבר
  `/privacy`, `/terms`, `/accessibility` ב-`layout.tsx` footer — טוב, כבר קיים) ולזרימת
  מחיקת-חשבון נגישה אם יש התחברות (Apple דורש את זה — Guideline 5.1.1(v) — **לבדוק שקיים
  מסלול מחיקת-חשבון לפני ההגשה, לא נמצא בסריקה הזו — צריך לאמת בנפרד**).

---

## 2. צ'קליסט מסודר לסשן הסקאפולד

הרשימה בסדר-ביצוע מומלץ. כל שורה מציינת את הפריט + מה כבר ידוע ממסמך זה.

1. **תלויות:** `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   @capacitor/browser @capacitor/app` (ה-שניים האחרונים קריטיים ל-OAuth flow מ-1.3, לא
   אופציונליים). `@capacitor-community/speech-recognition` — לדחות ל-backlog נפרד (1.1), לא
   בסקאפולד הראשוני.
2. **`npx cap init`** — appId (הצעה: `il.co.countme.app` בסגנון reverse-domain, לאשר מול יוני),
   appName "CountMe" (תואם `manifest.json`'s `short_name`).
3. **`capacitor.config.ts`** — להגדיר `server.url` ל-remote origin (1.7); **לא** `webDir` עם
   build מקומי. לוודא `server.androidScheme: "https"` (לא `http`, כדי לא לשבור cookies/CSP).
4. **אייקונים/splash מ-`public/` הקיים:**
   - מקורות זמינים: `public/icon-512.png` (512×512, any), `public/icon-maskable-512.png`
     (512×512, maskable — **טוב לאייקון-בסיס ל-`@capacitor/assets`**, כי הוא כבר בנוי עם
     safe-zone למיסוך), `public/countme-logo.svg` (וקטור — טוב ל-splash אם צריך רזולוציה
     גבוהה מ-512px). **אין כרגע מקור 1024×1024** — `@capacitor/assets` (הכלי הרשמי ליצירת
     כל גדלי האייקונים/splash לשתי הפלטפורמות) ממליץ מקור 1024×1024; להפיק מ-
     `countme-logo.svg` הווקטורי (לא למתוח את ה-512px).
   - צבעי splash: `background_color`/`theme_color` כבר מוגדרים ב-`manifest.json`
     (`#F1EFEA`/`#083A4F`) — להשתמש באותם טוקנים כדי לא לסטות מה-Brand Kit.
   - להריץ `npx @capacitor/assets generate` אחרי שיש מקור 1024×1024.
5. **Deep-link / OAuth callback (1.3) — הפריט הכי מסובך, לתכנן ראשון:**
   - להגדיר Universal Links (iOS, `apple-app-site-association` ב-שורש הדומיין) ו-App Links
     (Android, `assetlinks.json`) עבור הנתיב `/auth/callback` על `countmedemo-eight.vercel.app`.
   - להחליף את קריאת ה-OAuth ב-`login-form.tsx` (`supabase.auth.signInWithOAuth`) בזרימה
     שפותחת את ה-URL דרך `@capacitor/browser`'s `Browser.open()` כש-
     `Capacitor.isNativePlatform() === true`, ומשאירה את ההתנהגות הקיימת (ניווט רגיל בדפדפן)
     כש-`false` — **fallback ולא replace**, כדי לא לשבור את זרימת ה-web/PWA הקיימת.
   - להוסיף את ה-redirect URL/scheme החדש ל-allowlist של Supabase Auth (Dashboard → Auth →
     URL Configuration).
   - להשתמש ב-`@capacitor/app`'s `App.addListener('appUrlOpen', ...)` כדי לתפוס את החזרה
     מה-Universal Link ולסנכרן עם ה-router הקיים (`/auth/callback` ה-route handler הקיים
     יכול להישאר כמו-שהוא ברוב המקרים, כי remote-URL mode אומר שה-Universal Link בעצם מנווט
     בחזרה לאותו origin/route).
6. **Service Worker (1.2):** להוסיף בדיקת `Capacitor.isNativePlatform()` ב-
   `src/components/service-worker.tsx` ולדלג על `navigator.serviceWorker.register` כש-`true`
   — להכריע מפורשות (ולא להשאיר את זה "יקרה מה שיקרה").
7. **חשבונות חנויות:**
   - **Apple Developer Program** ($99/שנה) — צריך D-U-N-S/חשבון-ארגון (יוני, לא AI).
   - **Google Play Console** ($25 חד-פעמי) — לוודא מי הבעלים (חשבון-הפרויקט, לא אישי — לפי
     ההנחיה הקיימת ב-`CLAUDE.md` על Vercel hosting).
   - שני החשבונות דורשים גם **privacy policy URL ציבורי** (יש: `/privacy`) ו**delete-account
     flow** — **לאמת שקיים בפועל** לפני שמגישים (ראה סעיף 1.7, נקודה אחרונה — לא אומת במסמך זה).
8. **בדיקת-אש מוקדמת (לפני build מלא):** להריץ `npx cap add ios && npx cap add android`
   מקומית, `npx cap open ios`/`android`, לוודא שה-remote URL עולה ושה-Google Sign-In מחזיר
   את שגיאת ה-`disallowed_useragent` הצפויה (1.3) **בכוונה**, כדי לאמת אמפירית לפני שבונים
   את פתרון ה-`@capacitor/browser` — לא להניח, לבדוק.

---

## מקורות בקוד (לרפרנס מהיר)

| נושא | קובץ | שורות |
|---|---|---|
| Web Speech API | `src/app/invoices/new/page.tsx` | 67–136 |
| capture= קבלה | `src/app/expenses/new/page.tsx` | 573 |
| Service Worker רישום | `src/components/service-worker.tsx` | כל הקובץ |
| Service Worker לוגיקה | `public/sw.js` | כל הקובץ |
| Manifest | `public/manifest.json` | כל הקובץ |
| OAuth — כפתור/redirectTo | `src/app/login/login-form.tsx` | כל הקובץ |
| OAuth — callback route | `src/app/auth/callback/route.ts` | כל הקובץ |
| Session cookies refresh | `src/proxy.ts` (+ `src/lib/supabase/proxy.ts`) | כל הקובץ |
| persona cache + intent fallback | `src/lib/setup-storage.ts` | כל הקובץ |
| CSP + Permissions-Policy | `next.config.ts` | כל הקובץ |
| BOI fetch (client) | `src/lib/expenses/boi-exchange-rate.ts` + `src/app/expenses/new/page.tsx:157` | — |
| Regulatory fetch (שרת-בלבד, לא רלוונטי) | `src/lib/regulatory/sources.ts` | — |

**נעול:** `memory/decisions.md`, סשן 18/08/2026 ערב — "אפליקציה נייטיבית: Capacitor — שתי
החנויות".

---

## 3. עדכון 20/08/2026 — אין סקיל ייעודי; תוספת חשובה לסעיף 1.3/1.4

**בדיקת-סקילים לבקשת יוני:** חיפשתי (`npx skills find` על קטלוג skills-il + `SuggestSkills` על
הקטלוג הארגוני/Anthropic) סקיל ל"עיצוב מובייל" ול"הגשה לחנויות iOS/Android" — **שניהם החזירו
ריק**. skills-il הוא קטלוג עסקי-ישראלי (מס/פיננסים/משפט) — לא מכיל ידע-הנדסי כללי כמו הגשת-
אפליקציות-נייטיביות. אין כרגע דרך למשוך סקיל מוכן לנושא הזה; המשכתי מהידע הקיים + המסמך הזה,
שכבר מכסה את השטח לעומק (ראה סעיף 1-2 למעלה, מ-18/08).

**תוספת אמיתית מהסבב הזה (20/08): פיצ'ר "השאר אותי מחובר/ת" חדש (`src/lib/auth/session-preference.ts`)
משנה את סעיף 1.4 באופן ישיר.** המנגנון: `sessionStorage` (לא persistent) מסמן "הסשן הזה עדיין
פעיל"; היעדרו + `localStorage` ריק ⇒ sign-out אוטומטי. **זה בדיוק אותה מגבלת sessionStorage
scoped-לטאב שסעיף 1.3/1.4 כבר מזהים לגבי `CONTINUE_INTENT_KEY`** — ולכן צריך את אותה תשומת-לב
בסשן הסקאפולד: כש-OAuth יעבור דרך `@capacitor/browser` (חלון-דפדפן חיצוני, לא ה-WebView הראשי),
`sessionStorage` שנכתב ב-`login-form.tsx` **לפני** הקריאה ל-`Browser.open()` צריך לשרוד את
המעבר הלוך-חזור דרך ה-in-app-browser החיצוני ולחזור ל-WebView הראשי באותו הקשר — בדיוק כמו
שה-`CONTINUE_INTENT_KEY` הקיים כבר נבדק ל. **לא פעולה חדשה** (אותו מנגנון-בדיקה מ-1.3 מכסה את
זה), אבל **חובה לאמת את שניהם יחד** באותה בדיקת-אש (סעיף 2, פריט 8) — אם sessionStorage לא שורד
את הקפיצה, המשתמש ימצא את עצמו מנותק-אוטומטית אחרי כל התחברות-Google בתוך Capacitor, גם כשסימן
"השאר אותי מחובר/ת" **לא** מסומן (localStorage כן ישרוד — הבעיה תהיה ספציפית לזרימת "לא-remembered").
