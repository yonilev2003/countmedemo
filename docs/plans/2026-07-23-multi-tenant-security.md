# תוכנית אבטחה — מעבר מ‑single‑user/דמו ל‑multi‑user בטא

תאריך: 2026-07-23
סטאק: Next.js 16 (App Router) · Supabase RLS (פרויקט חי `hbsgzelipeawkvtcazdr`) · Vercel · Anthropic
מבוסס על audit רב‑חוקרי לאחר אימות אדוורסרי (findings שאושרו למטה).

---

## מטרה — single-user→multi-user, מה משתנה באבטחה

עד היום countme רץ כדמו/founder‑only: אין משתמשים אמיתיים, אין דאטה רב‑משתמשי ב‑DB, וה‑persona חי ב‑`localStorage` בלבד. המעבר ל‑בטא רב‑משתמשי (≈50 מוזמנים) משנה את מודל האיום מיסודו:

- **מ"אין זהות" ל"בידוד בין חשבונות"** — ברגע שיש יותר ממשתמש אחד, הסיכון המרכזי הוא ש‑user A יראה/יכתוב דאטה של user B (OWASP API #1 — BOLA/IDOR). הבידוד חייב להיאכף **בשרת** (RLS + בדיקות ownership), לא בקליינט.
- **מ"דמו חינמי פתוח" ל"מפתח API שמחייב כסף"** — endpoints שמריצים Claude (chat/coach/upload/parse-invoice) הופכים ליעד לניצול עלות/DoS ברגע שהם חשופים לאינטרנט.
- **קפיצת קטגוריה משפטית** — החזקת PII פיננסי + תעודות זהות של הרבה נבדקים מעלה את מסד הנתונים לרמת אבטחה "בינונית" לפי תקנות הגנת הפרטיות (אבטחת מידע) 2017, ומחילה חובות תיקון 13 (בתוקף 14/08/2025): זכויות עיון/תיקון/מחיקה, DPO מעל 10,000 נבדקים, הודעה על אירוע אבטחה. (ראה סעיף "מה ידני של יוני" → פרטיות.)

הכלל המנחה: **RLS הוא ה‑baseline ברמת ה‑DB, ואימות הרשאה ביישום הוא השכבה השנייה — צריך את שתיהן.** לפני המשתמש הלא‑founder הראשון, זה כל המשחק.

---

## מצב נוכחי — מה כבר טוב ומה חסר (לפי ה‑audit)

### מה כבר בנוי טוב (לא לגעת / לא לשבור)
- **RLS בנוי נכון על כל טבלה per‑user.** כל 12 הטבלאות ב‑`public` (`profiles, incomes, expenses, invoices, income_documents, invoice_sends, notifications, tax_rules, plans, subscriptions, payments, events`) מריצות `enable row level security` + לפחות policy אחת באותה מיגרציה שיוצרת אותן (`supabase/migrations/20260610090000_countme_init.sql` L153‑177, `20260617090000_billing.sql`, `20260617091000_events.sql`). מדיניות ה‑per‑user היא `for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)` — כולל `with check` על כתיבה, ו‑`anon` דוחה כברירת מחדל. ה‑`using (true)` היחיד הוא על טבלאות reference גלובליות (`tax_rules`, `plans`) וקריאה‑בלבד. **אין טבלה חשופה.**
- **service_role key מטופל נכון.** נקרא רק כ‑`process.env.SUPABASE_SERVICE_ROLE_KEY` ב‑`src/lib/supabase/admin.ts:11`, אף פעם לא ב‑`NEXT_PUBLIC_*`. ה‑admin client מיובא ב‑4 מודולים server‑side בלבד (`billing/checkout`, `billing/webhook`, `analytics/track`, `billing/entitlement`). `.gitignore` מכסה `.env*` ו‑`/secrets/`.
- **שכבת gating קיימת בקוד** — `requireUserIfGated` (`api-guard.ts`) ל‑API, ו‑gating עמודים ב‑`proxy.ts` — שתיהן מאחורי אותו flag `AUTH_GATING_ENABLED`. הקוד מוכן; רק ה‑flag כבוי.
- **reconcile של persona מול owner‑stamp** — `syncPersonaFromDb` (`persona-store.ts`) כבר מזהה cache שהוחתם למשתמש אחר ומנקה אותו (`clearLocalPersona` → מחזיר `null`).

### מה חסר / מסוכן במעבר לבטא
1. **`AUTH_GATING_ENABLED` כבוי** → `requireUserIfGated` הוא no‑op (`api-guard.ts:31‑33`), ה‑proxy לא מפנה (`proxy.ts:82‑86`). כל endpoint שמריץ Claude חשוף לאינטרנט מאחורי rate‑limiter in‑memory בלבד, שה‑JSDoc שלו עצמו אומר שהוא "speed bump, לא security boundary" (`rate-limit.ts:9‑20`, per‑instance). `upload/route.ts:64‑73` מריץ Claude vision על PDF שרירותי מאחורי ה‑guard המנוטרל.
2. **cache persona ישן עלול לדלוף בין משתמשים** גם עם gating דלוק — לא דרך ה‑flash ב‑`usePersona` (שממותן), אלא דרך ~13 דפי reader סינכרוניים שקוראים `loadPersona()` ומכניסים persona מלא (ת.ז., הכנסה, בנק) ל‑state לפני שה‑`PersonaHydrator` האסינכרוני מספיק לנקות (למשל `dashboard/page.tsx:51`). מגיעים לזה כשמשתמש קודם לא התנתק (תפוגת cookie / מכשיר משותף / חשבון שני) וה‑redirect `?next=` נוחת ישר על דף מוגן.
3. **billing webhook מאמין ל‑payload לא חתום** — `parseWebhook` (`tranzila.ts:60‑62`) הוא stub שמחזיר `paid:false` (fail‑closed היום), אבל אין אימות חתימה, וה‑route (`webhook/route.ts:38‑96`) סומך על `userId`/`amount`/`plan` מה‑payload וכותב דרך admin client שעוקף RLS. **חובה לסגור לפני `BILLING_ENABLED`.**
4. **rate limiting לא עמיד** — in‑memory per‑instance, בלי hard cost cap אצל Anthropic.
5. **login נשבר ב‑Vercel preview** — redirect‑URL של פריוויו לא ב‑allow‑list של Supabase (בעיית DX, לא בטא — ראה למטה).
6. **פערי regression‑prevention** — אין CI gate שיתפוס טבלה עתידית בלי RLS; אין `import "server-only"` ב‑`admin.ts`.
7. **RPCs עם `security definer` שמקבלים `user_id` שרירותי** — `get_next_invoice_number(p_user_id)` / `get_next_doc_number(p_user_id)` (`init.sql:125,136`) עוקפים RLS ומקבלים id של כל משתמש (דליפת מונה — info leak קל).

---

## פערים מדורגים

| # | פער | חומרה | בעלים | תיקון |
|---|---|---|---|---|
| 1 | `AUTH_GATING_ENABLED` כבוי → כל endpoint שמריץ Claude חשוף (ניצול עלות/DoS לא‑מאומת). אין זהות נאכפת בשרת. | **בינונית** | יוני‑קונסולה (flag) + קוד (defense‑in‑depth) | הדלקת ה‑flag ב‑Prod **וגם** Preview; Vercel WAF rate‑limit; תקרת עלות קשיחה ב‑Anthropic Console. |
| 2 | cache persona ישן עלול לדלוף PII מלא בין משתמשים במכשיר משותף (client‑cache בלבד; RLS בשרת שלם) | **בינונית** | קוד | לתקן `use-persona.ts:26`; guard על `loadPersona()` שידחה cache עם owner‑stamp זר; והדלקת gating (#1). |
| 3 | billing webhook סומך על payload לא חתום + כתיבות admin שעוקפות RLS (fail‑closed/gated היום) | **בינונית** | קוד | אימות חתימה HMAC/terminal‑secret ב‑`parseWebhook`; לגזור amount/plan מקטלוג ה‑DB לפי reference מאומת; להשאיר `BILLING_ENABLED` כבוי עד שהכל נוחת. |
| 4 | rate limiting לא עמיד + אין hard cost cap | **בינונית** (חלק מ‑#1) | יוני‑קונסולה | Vercel WAF rule (IP+path); Anthropic monthly budget alert + hard spend cap. אח"כ Supabase‑backed counter. |
| 5 | login נשבר ב‑Vercel preview (`*-git-*.vercel.app` לא ב‑allow‑list) | **נמוכה** | יוני‑קונסולה (Supabase) | להוסיף redirect ממוקד לפרויקט **hbsgz** (לא akfg); לבדוק Deployment Protection. פרודקשן לא מושפע. |
| 6 | אין CI gate ל‑RLS על טבלאות עתידיות (חשיפה נוכחית = אפס) | **נמוכה** | קוד/CI | step ב‑CI שנכשל אם טבלת `public` בלי RLS או בלי policy (`pg_tables`/`pg_policies` / `supabase db lint`). |
| 7 | `admin.ts` בלי `import "server-only"` | **info** | קוד | להוסיף `import "server-only";` כשורה ראשונה. |
| 8 | RPCs `security definer` מקבלים `user_id` שרירותי (info leak של מונה) | **נמוכה** | קוד (מיגרציה) | להסיר את פרמטר ה‑`user_id` ולהשתמש ב‑`auth.uid()` בתוך הפונקציה; או `revoke execute` מ‑`anon`/`authenticated` ולקרוא רק דרך admin. |

---

## מה מתקנים עכשיו בקוד (רשימה ממוקדת, בטוחה, ליישום היום)

כל אלה שינויי קוד קטנים, בטוחים, שלא תלויים בהדלקת flags ולא שוברים את הדמו:

1. **`src/lib/supabase/admin.ts`** — להוסיף `import "server-only";` כשורה הראשונה. הופך ייבוא בטעות מקומפוננטת קליינט לשגיאת build (defense‑in‑depth). זה הפריט היחיד שחסר בטיפול ב‑service_role.

2. **`src/lib/data/use-persona.ts`** — לסמוך על ה‑reconcile:
   - שורה 26: להחליף `setPersona(resolved ?? local ?? null)` ב‑`setPersona(resolved)` ו‑`setSource(resolved ? "db" : "empty")` — לא לצייר מחדש cache שה‑reconcile בדיוק ניקה.
   - שורה 22: instant‑paint של `local` רק כאשר `getPersonaOwner()` הוא null/absent (cache אנונימי). אחרת להחזיק skeleton עד ש‑`syncPersonaFromDb` מסתיים.

3. **guard על ה‑reader הסינכרוני (הנתיב עם ה‑PII המלא)** — לגרום ל‑`loadPersona()` (או reader משותף חדש, למשל `loadPersonaGuarded()`) לסרב להחזיר cache שה‑owner‑stamp שלו קיים אך לא תואם ל‑session הנוכחי, במקום להישען על הניקוי האסינכרוני של `PersonaHydrator`. להעביר את ~13 דפי ה‑reader (`dashboard`, `file/*`, `invoices/*`, `receivables`, `coach`, `alerts`, `deadlines`, `business-expenses`, `demo`, `setup/*`) לקרוא דרך ה‑guard. זה סוגר את הנתיב שבו user B תופס persona מלא של user A לפני שה‑hydrator מנצח.

4. **billing webhook — הקשחה מקומית (עדיין מאחורי `BILLING_ENABLED` כבוי):**
   - ב‑`src/lib/billing/tranzila.ts` → `parseWebhook`: לממש אימות חתימה HMAC/terminal‑secret ולדחות payload לא מאומת **לפני** שאפשר להחזיר `paid:true`. זו הבקרה הנושאת (כרגע stub fail‑closed).
   - ב‑`src/app/api/billing/webhook/route.ts`: לא לסמוך על `amount`/`plan` מה‑payload — לגזור `amountAgorot` ו‑`planId` מקטלוג `plans` ב‑DB לפי ה‑reference המאומת; לשמור את ה‑idempotency הקיים על `transactionId`; להוסיף rate limit; ולהתייחס ל‑`parseWebhook` כ‑fail‑closed גם ברמת ה‑route.

5. **CI gate ל‑RLS (regression prevention)** — step שמריץ שאילתה מול `pg_tables`/`pg_policies` (או `supabase db lint`) ונכשל אם טבלת `public` כלשהי חסרה RLS או בלי policy. הערה: MCP `get_advisors` **לא** שמיש כאן כי חשבון ה‑MCP לא רואה את פרויקט `hbsgzelipeawkvtcazdr` (ראה `CLAUDE.md`) — להשתמש בבדיקת SQL/CLI ב‑CI.

6. **הקשחת ה‑RPCs (מיגרציה חדשה)** — לשכתב `get_next_invoice_number` / `get_next_doc_number` כך שישתמשו ב‑`auth.uid()` פנימית במקום לקבל `p_user_id` שרירותי, או `revoke execute ... from anon, authenticated`. שינוי טבלת/פונקציית DB → לתעד ב‑`CLAUDE.md` ולהוסיף golden test אם רלוונטי.

> הערה: אין צורך בשום תיקון קוד ל"חשיפת RLS" — כל 12 הטבלאות כבר עם RLS+policy. הפער היחיד שם הוא regression‑prevention (פריט 5).

---

## מה ידני של יוני (Vercel / Supabase / Google — כולל תיקון login בפריוויו)

### א. הדלקת auth gating (open task #1 — הכי דחוף)
1. ב‑Vercel: להגדיר `AUTH_GATING_ENABLED=true` **גם ב‑Production וגם ב‑Preview**. `STATUS.md` מזהיר שאם ה‑var מוגדר רק על Production, פריוויו עוקף gating. Redeploy.
2. לאמת בסשן incognito: `/api/chat`, `/api/coach`, `/api/upload`, `/api/parse-invoice`, `/api/doc-link` ועמודים מוגנים מחזירים 401/redirect ל‑`/login`.

### ב. הגנת עלות (שורדת גם כש‑gating דלוק)
3. Vercel WAF: rule של rate‑limit לפי IP+path על ה‑routes שמריצים Claude — כדי שהצפות נדחות ב‑edge לפני שה‑function רצה. **לא** להסתמך על ה‑limiter ה‑in‑memory כגבול אבטחה (ה‑JSDoc שלו אומר זאת).
4. Anthropic Console: להגדיר monthly budget alert + hard spend cap.

### ג. תיקון login בפריוויו (בעיית DX, לא חוסם בטא)
5. **לא לגעת בפרויקט akfg (`akfgudspliyymiysajoh`)** — נטוש/INACTIVE לפי `docs/launch/connect-supabase-hbsgz.md` ו‑`memory/decisions.md`. הבקאנד החי הוא **hbsgz** (`hbsgzelipeawkvtcazdr`). עריכת akfg לא פותרת כלום.
6. רק אם באמת צריך OAuth על פריוויו: להוסיף redirect **ממוקד** ל‑hbsgz → Auth > URL Configuration > Redirect URLs:
   `https://countmedemo-git-*-yonilev2003s-projects.vercel.app/auth/callback`.
   **להימנע** מ‑wildcard רחב `https://*-yonilev2003s-projects.vercel.app/**` — הוא מרחיב open‑redirect/code‑leakage.
7. לבדוק קודם את Vercel Deployment Protection (preview SSO wall) — הוא שובר OAuth callbacks בפריוויו באופן עצמאי.
8. Google Console — **לא צריך שינוי** (ה‑authorized redirect הוא ה‑callback הקבוע של supabase.co). פרודקשן (`countmedemo-eight.vercel.app` = Site URL, **תוקן 05/08** — היה כתוב כאן `countmedemo.vercel.app` שגוי) לא מושפע.

### ד. Supabase Storage (העלאות receipts/106/PDF)
9. לוודא ש‑buckets פרטיים + RLS על `storage.objects` + signed URLs — אין להגיש קבצי מס דרך public bucket.

### ה. billing — לפני `BILLING_ENABLED`
10. להשאיר `BILLING_ENABLED` כבוי עד שאימות החתימה + גזירת amount/plan מה‑DB נוחתים (פריט קוד 4). זהו gate חובה לפני הפעלה, לא הקשחה אופציונלית. להוסיף Tranzila webhook signature ל‑env.

### ו. פרטיות (תיקון 13 / תקנות אבטחת מידע 2017) — לפני משתמש לא‑founder
11. דאטה פיננסי → רמת אבטחה **בינונית** לפחות (מעל 100K נבדקים או העברה שגרתית לצד שלישי → **גבוהה**: הצפנה, לוגי גישה, בדיקות תקופתיות).
12. **DPO** חובה מעל 10,000 נבדקים; זכויות עיון/תיקון/מחיקה נאכפות (פיצוי סטטוטורי עד ₪100,000/אדם ללא הוכחת נזק).
13. **הודעת אירוע אבטחה** — ישראל **לא** משטר 72h שטוח: ה‑PPA דורש הודעה **מיידית** על אירוע חמור.
14. **הסכמי DPA** מול Supabase/Vercel/Anthropic (מיקור חוץ, הנחיה 2/2011 + §15). עיבוד בארה"ב → תקנות העברת מידע לחו"ל 2001 (Reg 2(4)).
15. PII minimization לפני משתמשים לא‑founder (התוכנית ב‑WS7).

---

## בדיקות אימות — איך מוודאים ש‑user A לא רואה דאטה של user B

### 1. בידוד RLS ברמת ה‑DB (השכבה הקריטית)
- ליצור שני משתמשי בטא (A, B), כל אחד עם profile/incomes/expenses/invoices.
- עם ה‑anon key + JWT של A: `select * from incomes` → מחזיר רק שורות של A. לנסות `select ... where user_id = <B_id>` → 0 שורות (לא error — RLS מסנן).
- לנסות `insert`/`update` עם `user_id = <B_id>` תחת JWT של A → נדחה ע"י `with check`.
- עם ה‑anon key **בלי** JWT: כל טבלת per‑user מחזירה 0 שורות; `tax_rules`/`plans` קריאה בלבד.

### 2. IDOR/BOLA ברמת ה‑API/עמוד
- לכל route/עמוד שמקבל object id מהקליינט (invoice number, doc id): לאמת ownership בשרת. בדיקה: A מבקש `/invoices/<B_invoice>` → 404/403, לא הנתונים של B.
- לאמת שאף נתיב שמשתמש ב‑admin client לא מקבל `user_id` מהקליינט בלי אימות (webhook, RPCs).

### 3. דליפת cache persona (הנתיב הלקוח‑צד)
- תרחיש מכשיר משותף: A מתחבר, ממלא persona, **לא** מתנתק (לסמלץ תפוגת cookie). B מתחבר באותו דפדפן וה‑redirect `?next=` נוחת ישר על `/dashboard`.
- ציפייה אחרי התיקון: B **לא** רואה את הת.ז./הכנסה/בנק של A אפילו לרגע. ה‑`loadPersona()` guard דוחה cache עם owner‑stamp זר לפני קריאה סינכרונית; `use-persona.ts` מחזיק skeleton עד reconcile.
- לבדוק גם את `/home` (firstName בלבד) — לא re‑paint של persona הקודם אחרי reconcile.

### 4. אימות gating (post‑flag)
- incognito ללא session: `/api/chat`, `/api/coach`, `/api/upload`, `/api/parse-invoice`, `/api/doc-link` → 401; עמודים מוגנים → redirect ל‑`/login?next=`.
- לוודא שההתנהגות זהה ב‑Preview וב‑Production (שניהם עם ה‑flag).

### 5. billing webhook (post‑signature, pre‑`BILLING_ENABLED`)
- לשלוח payload מזויף עם `userId` של משתמש אחר ובלי חתימה תקינה → נדחה (`paid:false`/reject), אין כתיבה ל‑`subscriptions`/`payments`.
- לשלוח payload עם amount/plan מנופחים → ה‑route גוזר מ‑DB, מתעלם מהערכים מה‑payload.
- replay של אותו `transactionId` → idempotent (duplicate), אין כתיבה כפולה.

### 6. regression gate (CI)
- להוסיף מיגרציה ניסיונית עם טבלת `public` בלי RLS → ה‑CI gate נכשל.
