# tests/load — בדיקות עומס (k6)

בדיקות עומס עבור countme (v2 plan, סעיף 5.2 — החלטה נעולה של יוני:
**בדיקות עומס רצות מול Vercel Preview בלבד, לעולם לא מול Production**).

הספרייה הזו כוללת שלושה תרחישי k6, סקריפט smoke ללא תלות ב-k6, וקובץ ה-README
הזה. שום קובץ כאן לא נוגע ב-npm dependencies של האפליקציה עצמה — k6 הוא כלי CLI
נפרד, לא חבילת node.

## אזהרה — לפני שמריצים משהו

**לעולם אל תריצו את הסקריפטים האלה מול:**

1. **הדומיין הראשי / Production deployment** (`countmedemo.vercel.app` או
   דומיין מותאם אישית שמצביע ל-Production). כל הסקריפטים כאן, ובמיוחד
   `k6-ai-cost-attack.js`, יוצרים תעבורה שנועדה להיראות כמו התקפה —
   להריץ את זה מול production זה פשוט DoS עצמי.
2. **כל deployment (כולל Preview) שמחובר לפרויקט Supabase האמיתי עם נתונים
   אמיתיים.** `POST /api/track` כותב שורות אמיתיות לטבלת `events` בלי אימות
   (ראו את ההערה על כך ב-`src/app/api/track/route.ts`) — הרצת עומס תמלא את
   הטבלה בזבל. ודאו שה-Preview שאתם מכוונים אליו מוגדר עם `NEXT_PUBLIC_
   SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` של פרויקט staging/דמה, לא של
   הפרויקט החי `hbsgzelipeawkvtcazdr`.
3. **כל deployment שבו אתם לא רוצים לסכן תקציב Anthropic אמיתי.**
   `k6-ai-cost-attack.js` שולח בקשות ל-`/api/chat` ללא אימות במכוון — המטרה
   היא לוודא שהן נחסמות *לפני* שמגיעות ל-Anthropic. אם ההגנות שבורות,
   הריצה הזו עלולה לצרוך תקציב אמיתי. טיפ: אפשר להריץ פעם ראשונה מול
   Preview שבו `ANTHROPIC_API_KEY` **לא** מוגדר בכלל — במקרה הזה worst-case
   הוא 503 מיידי (ראו את ההערה על 503 בתחילת `POST` ב-
   `src/app/api/chat/route.ts`), אפס סיכון כספי, ורק אחר כך להריץ ב-VU נמוך
   מול Preview עם מפתח אמיתי כדי לוודא שההוצאה בפועל נשארת אפסית.

ה-Preview הכי בטוח הוא deployment שנוצר מ-branch נפרד (לא `main`), עם env vars
של staging בלבד ב-Vercel (Environment: Preview, לא Production).

## התקנת k6

בחרו אחת:

```bash
# macOS (Homebrew)
brew install k6

# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6ACFD8
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (שום התקנה מקומית — מריצים ישירות דרך המכולה הרשמית)
docker run --rm -i -e BASE_URL=https://<preview>.vercel.app grafana/k6 run - < tests/load/k6-browse.js
```

בקונטיינרים מנוהלים (web containers, CI) שבהם אי אפשר להתקין k6 — יש
`smoke.mjs` (ראו למטה) שמריץ גרסה מצומצמת בלי שום תלות.

## איך משיגים Preview URL מ-Vercel

הכי פשוט: פתחו PR/branch — Vercel בונה אוטומטית Preview deployment ומגיב
בקישור בתגובת ה-PR. או, מקומית:

```bash
npx vercel          # דורש vercel login — בונה ומעלה Preview מהברנץ' הנוכחי
# הפלט כולל URL כמו https://countmedemo-git-<branch>-<team>.vercel.app
```

או דרך הדשבורד: Vercel → הפרויקט → **Deployments** → בחרו deployment שאינו
מסומן Production → **Visit**.

### חשוב: Deployment Protection

אם ל-Preview deployments של הפרויקט מופעלת הגנת Vercel (Vercel Authentication /
Password / SSO — בד"כ ברירת המחדל ל-Preview), כל בקשה שאינה מהדפדפן המחובר
תיתקל ב-interstitial של Vercel במקום באפליקציה עצמה — ואז כל התרחישים כאן
בודקים את דף ה-SSO של Vercel, לא את countme.

הפתרון: **Project Settings → Deployment Protection → "Protection Bypass for
Automation"** — ייצרו טוקן, והעבירו אותו לכל הסקריפטים כאן דרך
`VERCEL_BYPASS_TOKEN` (כל ארבעת הקבצים קוראים אותו ומוסיפים את הכותרת
`x-vercel-protection-bypass` לכל בקשה אוטומטית). דוגמה בהמשך.

`VERCEL_BYPASS_TOKEN`, בדיוק כמו `BASE_URL`, הוא משתנה סביבה של **כלי בדיקת
העומס בלבד** — לא נקרא על ידי אפליקציית Next.js עצמה, ולכן הוא לא מתועד
ב-`.env.template` של הפרויקט (זה מתעד רק משתני סביבה שהאפליקציה קוראת
בזמן ריצה).

## הרצת כל תרחיש

כל הסקריפטים קוראים את `BASE_URL` מ-`__ENV` (ברירת מחדל: `http://localhost:3000`
לבדיקה מקומית מול `npm run dev`):

```bash
# תרחיש 1 — גלישה אנונימית (50 VUs, ramp של 2 דקות)
k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-browse.js

# תרחיש 2 — אשף /setup (20 VUs)
k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-wizard.js

# תרחיש 3 — התקפת עלות על /api/chat (30 VUs, ללא אימות) — החשוב מכולם
k6 run -e BASE_URL=https://<preview>.vercel.app tests/load/k6-ai-cost-attack.js

# עם Deployment Protection bypass:
k6 run \
  -e BASE_URL=https://<preview>.vercel.app \
  -e VERCEL_BYPASS_TOKEN=xxxxxxxx \
  tests/load/k6-ai-cost-attack.js
```

אפשר לדרוס משך/VUs מה-CLI בלי לגעת בקובץ, למשל להרצה קצרה בזמן פיתוח:

```bash
k6 run -e BASE_URL=... --vus 5 --duration 15s tests/load/k6-ai-cost-attack.js
```

## מה כל תרחיש בודק, ומה המשמעות של מעבר/כישלון

| תרחיש | מה מדמה | יעד (threshold) | כישלון אומר... |
|---|---|---|---|
| `k6-browse.js` | 50 גולשים אנונימיים ב-`/`, `/login`, `/coach` | p95 < 1500ms, שגיאות < 1% | הדפים הציבוריים איטיים/נופלים תחת עומס רגיל — בעיית ביצועים, לא אבטחה |
| `k6-wizard.js` | 20 משתמשים ממלאים את אשף `/setup` (טעינת עמוד + אירועי `/api/track`) | p95 < 2000ms | האשף — הזרימה המרכזית של המוצר — לא עומד בקצב הרשמה סביר |
| `k6-ai-cost-attack.js` | 30 תוקפים ללא אימות שולחים ל-`/api/chat` היסטוריות בגודל מקסימלי (בתוך הגבולות של `validateBody`, לא מעליהם — כדי למדוד את ה-rate-limit/auth ולא את בדיקת הקלט) | **≥95% מהבקשות נדחות ב-401/429, אפס 5xx** | **ריצה שבה 200 שולט אומרת שהגנות העלות נסוגו — טפלו כ-P0, לא כממצא ביצועים** |

k6 מדפיס טבלת thresholds בסוף הריצה (`✓`/`✗` לכל threshold) וקוד היציאה הוא
1 אם threshold כלשהו נכשל — מתאים ישירות ל-CI/פייפליין.

### ניואנס לגבי 5xx ב-`k6-ai-cost-attack.js`

שני מצבים לגיטימיים באפליקציה מחזירים 5xx בלי שהתוקף "ניצח": תקציב AI
במצב `paused` (`getBudgetState()`) מחזיר 503, וגם `ANTHROPIC_API_KEY` חסר
מחזיר 503 (שני המקרים ב-`src/app/api/chat/route.ts`, תחילת `POST`). אם
הריצה נכשלת על `server_errors_5xx` וכל ה-5xx הם 503 מאחד משני המקרים האלה —
זה לא באג באבטחה (אף טוקן לא נצרך), אבל זה כן שווה לתעד מה גרם לזה לפני
שסוגרים את הממצא.

## `smoke.mjs` — כשאין k6

סקריפט Node ללא שום תלות (רק `fetch`/`AbortController` המובנים) שמריץ גרסה
מצומצמת של 15 שניות של תרחישים 2+4, עם concurrency של כ-8, ומדפיס טבלת
PASS/FAIL. קוד יציאה 1 בכישלון — מתאים ל-CI/dev containers שבהם התקנת k6
לא זמינה או לא שווה את זה לבדיקת שפיות מהירה.

```bash
node tests/load/smoke.mjs
# או מול Preview:
BASE_URL=https://<preview>.vercel.app node tests/load/smoke.mjs
VERCEL_BYPASS_TOKEN=xxx BASE_URL=https://<preview>.vercel.app node tests/load/smoke.mjs
```

`smoke.mjs` הוא בדיקת שפיות מהירה, לא תחליף לריצות k6 המלאות — משך קצר
ו-concurrency נמוך בכוונה, כדי שירוץ תוך שניות ולא ידרוש תשתית ייעודית.
