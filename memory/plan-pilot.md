# countme — מ-דמו לפיילוט: תוכנית מלאה (4 שבועות)

> נכתב 2026-06-07 (יום א׳). מאחד **אסטרטגיה** (6 צירים, go-to-market) עם **ארכיטקטורה טכנית**
> (Phases 0-6), מאומת מול Next.js 16 ומול הקוד בפועל. מאחד את כל ההערות מכל השיחה.

## Context — למה אנחנו עושים את זה
יש דמו עובד שמכוון ל-EY (דרך מאיץ הסטודנטים **Momentum**). מהות המוצר: **companion** שמלווה מילוי
1301 — המשתמש מעתיק ערכים מחושבים לטופס האמיתי ב-`secapp.taxes.gov.il`, **לא** מגיש אוטומטית. המטרה: **תוך חודש — פיילוט אמיתי ל-3-5 עצמאים**, ולפניו **self-test על
תום-לב (CEO) ויוני (CTO)**. הפער האמיתי הוא לא פיצ'רים (≈88-100% מהסקופ הלא-חסום בנוי) — אלא
ש**אין auth/DB**: הכל רץ על persona יחיד ב-localStorage. הפיילוט דורש שכל משתמש יקבל חשבון פרטי
ונתונים מבודדים. במקביל רצים צירים לא-טכניים (משפטי→סייבר→תמחור, שיווק, ארגוני) שתואמים את
היציאה לשוק. **תובנת-מפתח:** מועד הדו"ח השנתי (1301) כבר עבר → הערך המיידי לפיילוט הוא
ההתחייבויות החיות — מקדמות, מע"מ דו-חודשי, ביטוח לאומי — שכבר בנויים (`lib/forecast`/`alerts`/`deadlines`).

## עיקרון-על: תוכנית חיה (מבוססת-מחקר)
התוכנית **מתעדכנת תוך כדי**, לפי מחקר וממצאים. פריטים מסומנים **🔬 תלוי-מחקר** הם הערכות שעשויות
להשתנות אחרי בדיקה (היקף/היתכנות/עלות) — לא התחייבות. הדוגמה הבולטת: **חשבונית ישראל** (חינמית
אך אולי מורכבת טכנית) — מוכרעת ע"י ספייק-היתכנות בשבוע 1 (ראו A9).

## עוגני-החלטה שננעלו בסשן
| נושא | החלטה | משמעות |
|---|---|---|
| מהות הפיילוט | **ליווי 1301 (companion) + אופס שנתי מלא** | לא מגישים בשמם → **אין צורך באישור תוכנה/מייצג** לפיילוט |
| נתונים | **Supabase עכשיו** (auth + Postgres + RLS) | גובר על "Day 2+" שהיה נעול ב-`memory/decisions.md` |
| תמונות הקיצורים | **רף ויזואלי לשיווק** + **הסרגל = פיצ'ר** בדשבורד | strict ל-Brand Kit; הנחה: UI ישתנה → נועלים ארכיטקטורה+backend מתחת |
| זמנים | **4 שבועות מהיום** | יעד השקה ~5-9.7; מייסדים תוך שבועיים, פיילוט תוך 4 |
| onboarding | **Self-serve** | אשף `/setup` קריטי — כל משתמש נכנס דרכו לבד |
| קהל | **רשת קרובה** | פידבק גבוה, גיוס מהיר |
| זרימה | `/` → "התחל/כניסה" → `/auth/login` → `/dashboard` (device-adaptive + סרגל) | |
| auth | **סיסמה + Google OAuth** (נאמן ל-handoff) | creds בלבד ב-Google Cloud, לא hosting |
| חברה בע"מ | אחרי הפיילוט, בכפוף להסכם מייסדים | |

## צוות (מי-מי) — מי עושה מה
| שם | תפקיד | בתוכנית |
|---|---|---|
| **תום-לב (תומי)** | CEO (+מוביל שיווק בינתיים) | self-test מייסדים; ציר ה׳. *[אם תומי≠תום-לב — לתקן]* |
| **יוני** | CTO (הבנייה) | self-test; כל ציר א׳ |
| **רוי** | חשב — פיננסים+רגולציה | צירים ב׳/ד׳; מיפוי רגולטורי; PDF; software-approval |
| **יעל** | עו"ד פרטיות/רגולציה | פגישה שבוע 1; R1/L1/L5; "מה עוד?" |
| **פרל כהן** | עו"ד תאגידי | הסכם מייסדים (L3), IP/ויתור (L4) |
| **מאיה** | רו"ח (קשר EY) | משימה #1 (גבול רו"ח↔AI); פגישת שבוע 2 |
| **שי שוורץ** | סייבר/אבטחה | ציר ג׳ שבוע 3; Pen-Test |
| **ליה** | שותפה קודמת | ויתור/הקצאת-זכויות (L4) |

## המסלול הקריטי — 5 שבועות (שבועות-עבודה, מ-א׳ 7.6)
| שבוע | תאריכים | משפטי/ארגוני (קודם) | מוצר→פיילוט | שיווק/תמחור |
|---|---|---|---|---|
| **1** | א׳ 7.6–ה׳ 11.6 | פגישת **יעל**; רוי מיפוי רגולטורי; טיוטת מייסדים | **Phase 0-1: Supabase+auth+schema; self-test מייסדים; 🔬 ספייק חשבונית-ישראל** | זהות שיווקית — kickoff תומי |
| **2** | א׳ 14.6–ה׳ 18.6 | **תוכנית הגשה משפטית מוכנה**; פגישת **מאיה/EY** | **Phase 2-4: swap 13 דפים→DB, auth, proxy** | טיוטת מייסדים → **פרל כהן** |
| **3** | א׳ 21.6–ה׳ 25.6 | פגישת **סייבר/שי**; ויתור ליה | **Phase 5-6: דשבורד device-adaptive + סרגל + seed** | — |
| **4** | א׳ 28.6–ה׳ 2.7 | — | הקשחה + מסך פרטיות + ממצאי שי | **תמחור** עם חשב רוי; אוטומציות |
| **5** | א׳ 5.7–ה׳ 9.7 | — | **השקת פיילוט ל-3-5** (~5-7.7) | **פוסטים חיים עד ג׳ 7.7** |

---
# ציר א׳ — מוצר→פיילוט (בנייה טכנית)

## מסע הלקוח (Customer Journey) — עדכון מתמשך 🔬
> מתעדכן לפי הערות מסע-לקוח (בתהליך, עוד יגיעו).

**עוגן-מוצר: מוכוון-דו"ח, לא מוכוון-דשבורד.** ה-1301 הוא עמוד-השדרה; הדשבורד תצוגה תומכת.
**הוכרע:** אחרי login → ישר לדשבורד עם ברכת-שלום אישית ("שלום, [שם]" — כמו ב-handoff). הדשבורד
**מבליט את מצב-הדו"ח/ההגשה**. מישור 1 → דשבורד "מתחילים"; מישור 2 → דשבורד מאוכלס.

**ערך מיידי לפיילוט: מקדמות + מע"מ (הדו"ח השנתי כבר עבר).** מועד 1301 ל-2025 חלף (30.6) לרוב
המגישים → הערך המיידי = ההתחייבויות החיות:
- **מקדמות מס הכנסה** (חודשי/דו-חודשי) — `lib/forecast` (תכנון-מול-ביצוע) + `ForecastCard`.
- **מע"מ דו-חודשי** — `lib/alerts` + `lib/deadlines`. · **מקדמות ביטוח לאומי** — `lib/deadlines`.
- הדשבורד (handoff: "Next Deadline", פסי VAT/ב"ל, Timeline) מבליט אותם — זה ה-hook. ה-1301 רלוונטי ל-2026 (בצבירה) ולמי שיש הארכת-מייצג.

**שני מישורי onboarding:**
| מישור | מי | מה צריך | השלכה על הבנייה |
|---|---|---|---|
| **1. חדש מאפס** | אין הכנסות/הוצאות; 1301 **לא רלוונטי** | חשבון → עסק/עיסוק קליל → תיעוד מהיום | דשבורד "מתחילים"; דו"ח ריק; **לדלג על /file** |
| **2. "עם ניסיון"** | מגיע מכלי אחר; **יש דאטה** | **ייבוא/מיגרציה** → אכלוס persona → דו"ח+דשבורד מלאים | נשען על `/api/upload` (106/אקסל/PDF); /file רלוונטי |

- **/file:** מישור 1 → לא מציגים מילוי 1301, מפנים לתיעוד שוטף; מישור 2 → מילוי אחרי ייבוא.
- **ניוד דאטה (פתוח — על תומי):** איך מעבירים דאטה ממערכת קיימת (מתחרה/הנה"ח) — פורמטים/ייצוא/API? מזין מישור 2. בינתיים ייבוא קבצים דרך `/api/upload`.
- **דו"ח מול דשבורד:** היום `/dashboard` + `/dashboard/pl-report` מעורבבים. **החלטה:** ה"דשבורד" = הדאטה הקיימת (P&L) בעיצוב ה-handoff; להבהיר בקופי מה "דו"ח" ומה "דשבורד".

## תנאי-קדם (לפני שורת קוד)
1. **`npm install`** — אין `node_modules` בצ'קאאוט (רק `package-lock.json`).
2. ואז **לקרוא `node_modules/next/dist/docs/`** (proxy, cookies, route-handlers, server-components) — `AGENTS.md` דורש.

## Next 16 — gotchas מאומתים (מעצבים את הארכיטקטורה)
| נושא | מה השתנה / הסיכון |
|---|---|
| middleware | **`middleware.ts` → `proxy.ts`** (16.1+), פונקציה `proxy`, Node-runtime. ⚠️ `crm-snapshot` על השם הישן — לא verbatim |
| `cookies()`/`headers()` | **async בלבד** → `await cookies()`; ה-server client factory חייב `async` |
| כתיבת cookie מ-Server Component | זורקת → `try/catch` בולע ב-`server.ts`; ה-`proxy` מרענן session |
| build | webpack (לא turbopack); `tsconfig` מחריג `crm-snapshot` — לא "למודרן" |
| Route Handlers | חתימת `Request`/`Response` נשמרת — `/api/chat`,`/api/coach` (SSE) ללא שינוי מבני |

**רפרנס:** `crm-snapshot/src/lib/supabase/{client,server,admin}.ts` — אותה גרסה (`next@16.2.4`), להעתיק מבנה, **לשנות middleware→`proxy.ts`**, להסיר ענפי demo.

## Phase 0 — deps + clients + env · עצמאי (worktree A)
- deps: `@supabase/ssr`, `@supabase/supabase-js` (גרסאות מוכחות ב-crm-snapshot).
- `src/lib/supabase/client.ts` (browser) · `server.ts` (**async**, `await cookies()`, try/catch swallow) · `admin.ts` (service-role, server-only).
- `.env.template` כבר מכיל את 3 המשתנים. **`SUPABASE_SERVICE_ROLE_KEY` לעולם לא ב-`NEXT_PUBLIC_*`/קליינט.**
- אינרטי — האפליקציה עדיין רצה על localStorage.

## Phase 1 — schema + RLS · עצמאי, דרך Supabase MCP (worktree B)
- **JSONB-first** (lift מהיר; calculators צורכים את האובייקט המקונן ישירות):
  - `personas(user_id uuid PK → auth.users, data jsonb, display_name, updated_at)` — שורה אחת למשתמש.
  - `follow_up_notes(id, user_id, target_id, text, done, created_at)`.
- **דוחים** טבלאות invoices/expenses מנורמלות — חיות ב-`persona.income.invoices[]/expenses[]`. ה-`db/*` יהיו façades מעל ה-JSON.
- **RLS חובה:** `auth.uid() = user_id` לכל SELECT/INSERT/UPDATE/DELETE; `anon`=כלום. `get_advisors` לאימות. `generate_typescript_types` → `database.types.ts`.

## Phase 2 — שכבת-נתונים + `usePersona()` · single-track (תלוי 0+1)
התפר היציב מתחת ל-UI המתחלף. מטרה: 13 הדפים משתנים import אחד + effect אחד כל אחד.
- `src/lib/db/{personas,notes,invoices,expenses}.ts`. `upsertPersona(user_id, data)` = מה ש-`savePersona` הופך אליו.
- `src/lib/db/use-persona.ts` → `{ persona, loading, save, patch }`. **שלוש צורות מהקוד:**
  - *redirecting* (רוב הדפים): מחליף `loadPersona()`+redirect. שומר `loading` (לא לשבור skeleton של הדשבורד שמחשב `pl`).
  - *optional* (`/coach`): `{ requireSetup: false }` — בלי redirect.
  - *writers* (`/file/guided`, `/invoices/new`): `save(next)` / `patch(path,value)`.
- **API session-validation** (`/api/chat`,`/api/coach`): להפסיק לסמוך על persona מהקליינט → `getUser()` מה-session → `getPersona()` בשרת → 401/400. `chat-panel.tsx` מפסיק לשלוח persona (commit אחד).
- **`/demo` חריג:** נשאר על localStorage (dana-cohen), עוקף auth.

## Phase 3 — auth (סיסמה + Google OAuth, נאמן ל-handoff) · single-track עם Phase 4
- **Email+סיסמה + Google OAuth** (Supabase Auth). setup: Google Cloud OAuth (client ID/secret — **creds בלבד**), אימות-מייל, איפוס-סיסמה.
- **invite-only לפיילוט:** signup ציבורי gated; 3-5 מיילים מאושרים מראש (allow-list / `admin.inviteUserByEmail`); Google מוגבל לאותם מיילים.
- **KYC (PDF §2):** זיהוי צד-ג' (Onfido/Au10tix: ת"ז+Liveness) — **דחוי לפיילוט** (invite-only רשת-קרובה); בינתיים וולידציית ת"ז עם `israeli-id-validator`. KYC מלא לפני פתיחה ציבורית.
- `auth/login` + `auth/signup` (`signInWithPassword`/`signUp` + `signInWithOAuth({provider:"google"})`) · `auth/callback/route.ts` (`exchangeCodeForSession`→`/dashboard`) · `auth/signout`. עיצוב glass/card מה-handoff.
- **דף הבית** (`page.tsx`, RSC): "התחל/י עכשיו"→signup, **"כניסה"**→login (אין היום); "ראה/י דמו"→`/demo`.

## Phase 4 — `proxy.ts` (רענון session + gating) · single-track עם Phase 3
- `proxy.ts` בשורש (**לא** `middleware.ts`), `await getUser()` לרענון, ואז gating: לא-מחובר בנתיב-מוגן → redirect ל-`/auth/login`. **allow-list:** `/`, `/demo`, `/auth/*`, נכסים סטטיים.

## Phase 5 — דשבורד device-adaptive + סרגל quick-actions · עצמאי UI (worktree C)
אסטרטגיה רזה: responsive CSS + hook קטן + keyboard handler. **לא native.**
- `src/components/shell/use-device-type.ts` — media-query + `pointer:coarse`, SSR-safe.
- `src/components/shell/quick-actions.tsx` (brand-strict: `btn()`, brand icons, logical props, ללא hex/emoji):

  | פעולה | יעד | אייקון | קיצור |
  |---|---|---|---|
  | קבלה | `/invoices/new?doc=receipt` | `ReceiptIcon` | ⌘R |
  | חשבון עסקה | `/invoices/new?doc=tax-invoice` | `FileTextIcon` | ⌘I |
  | הצעת מחיר | `/quote` (stub) | `PencilIcon` | ⌘Q |
  | לוח בקרה | `/dashboard` | `BarChartIcon` | ⌘D |

  - **מחשב:** סרגל קבוע + `keydown` (Cmd/Ctrl), guard נגד שדות-קלט, רמז-קיצור גלוי.
  - **אייפון:** FAB רדיאלי (Plus↔X), יעדי-מגע ≥44px, `env(safe-area-inset-*)`, התקנת PWA (`beforeinstallprompt`; iOS→רמז "הוסף למסך הבית").
- `layout.tsx`: להוסיף `export const viewport = {…, viewportFit:"cover", themeColor:"#083A4F"}` (חובה ל-safe-area; היום אין).
- **`/quote` stub** — דף "בקרוב" ממותג. בסיס: `lib/invoice-generator/*`.
- *merge:* חיבור הדשבורד **אחרי** ה-swap של Phase 2 ל-`dashboard/page.tsx`.

## Phase 6 — seed personas
- seed ל-3-5 (self-serve `/setup`, או pre-seed דרך MCP `execute_sql`). `dana-cohen.json` נשאר seed ל-`/demo`.

## הקשחה (שבוע 4) — מ-pre-launch של CLAUDE.md
- **rate-limit על `/api/chat`+`/api/coach`** (per-IP) — CLAUDE מסמן **קריטי** (עלות Anthropic).
- **input-validation** על ה-`message` (אורך, ניקוי control-chars).
- **error boundaries** — כבר יש `error.tsx`/`global-error.tsx`; לוודא כיסוי top-level.
- **Vercel alerts** + תקרת-תקציב Anthropic.

## A6. תיקוני Brand-Kit (strict) — ממצאי חקירה
| קובץ | שורות | תיקון |
|---|---|---|
| `src/app/file/companion/page.tsx` | 321,323-324,341 | raw-hex gov.il בדף מוצר → טוקני brand |
| `src/components/brand/status.tsx` | 24,30 | `text-[#7d6422]/[#9c3826]` → `--color-due-text`/`--color-overdue-text` |
| `src/app/deadlines/page.tsx` | 64 | אותו hex חסר-טוקן |

`/demo`, `form-1301/*`, `globals.css:97` (Heebo ל-gov) — **לא נוגעים** (פטור נעול). `global-error.tsx` inline-hex — מקובל.

## A7. IA (מעודכן)
`/demo` = נכס מכירה ל-EY (נפרד) · `/file/expert` מפנה ל-`/demo` · `/file/guided`+`/companion` **שניהם נשארים** (companion=ברירת-מחדל) · שאר דפי המוצר → session+DB.

## A9. חשבונית ישראל + רישום למערכות רשות המסים 🔬 תלוי-מחקר
**למה כאן:** הפיילוט כולל אופס שנתי → הוצאת חשבוניות (`/invoices/new`). לפי **חשבונית ישראל**,
חשבונית-מס מעל סף דורשת **מספר הקצאה** (9 ספרות) בזמן ההוצאה, אחרת הלקוח לא מנכה מע"מ תשומות.
- **הסף צונח:** 25,000₪ (5.5.24) → 10,000₪ (1.1.26) → **5,000₪ (1.6.26 — בתוקף)**. [לאמת מול `israeli-e-invoice`.]
- **מקור הסיבוך:** OAuth2 מול ITA — רישום Org+App, Client ID/Secret, access+refresh (refresh פג כל 90 יום), בקשת הקצאה per-invoice ב-JSON, דרישות אבטחה (שמירת טוקנים, לוג מלא, תיעוד כשלונות), אולי ייפוי-כוח. **חינמי** — העלות מורכבות, לא כסף. ספק: "Israel Invoice Model API v2.0".
- **המלצה לפיילוט (רזה):**
  1. **ספייק היתכנות שבוע 1** — רישום כבית-תוכנה, ה-spec, sandbox. *מכריע* אם נכנס לפיילוט.
  2. בינתיים: `InvoiceLine` מקבל **`allocationNumber` ידני** (`src/lib/persona.ts`) — המשתמש מזין מהפורטל; countme מתעד ל-1301.
  3. OAuth מלא = fast-follow (בסיס: `israeli-e-invoice` + `lib/invoice-generator/*`).
- **הבחנה:** מערכת המייצגים/שע"מ = **מחוץ לפיילוט**; רישום כבית-תוכנה = רלוונטי רק אם/כש-countme מוציא חשבוניות אמיתיות.

## A10. עיצוב — הטמעת `design_handoff_countme 2/` (מ-GitHub/main)
**ממצא:** ה-design-system של ה-handoff **תואם ~99% ל-Brand Kit** (אותם navy/beige/teal/Assistant) → **restyle בטוקנים קיימים, לא מערכת חדשה.** הבדל יחיד: beige-100 `#EBE3D5` (handoff) מול `#EFE7DA` (קוד).
| מסך handoff | יעד | סוג |
|---|---|---|
| Landing | `page.tsx` | restyle |
| Auth glass + Card | `/auth/login`(+signup) | **net-new** |
| Dashboard Web | `/dashboard` דסקטופ (sidebar 104px + grid 3-טורים, 6 כרטיסים) | restyle |
| Dashboard App | `/dashboard` מובייל (tab-bar + FAB + stack, safe-area) | restyle/adapt |
| Shortcuts | `components/shell/quick-actions.tsx` | **net-new** |
| Invoice | `/invoices/new` | restyle |
| Chat (איתן) | `/coach` + `components/agent/*` | restyle |
| Brand Kit | `globals.css` | ולידציה |
- **device-adaptive:** Web מול App = **שני layouts** (sidebar+grid מול tab-bar+stack) → `useDeviceType`/media-query, לא native.
- **הבאה:** התיקייה על `main` (cc4b26), לא על הענף → checkout/cherry-pick (reference בלבד, לא נפרס למשתמש).

## A11. הרשמת יוזרים + אחסון ב-Supabase (מורחב — לבקשת הצוות)
- **הרשמה:** invite-only. זרימה: בית → "כניסה" → auth → callback → יש persona ל-`auth.uid()`? → dashboard, אחרת → /setup (לפי מישור).
- **מה נשמר:** `personas` (JSONB per-user, מפתח `auth.uid()`) — אישי/עסק/בנק/הכנסות/הוצאות/חשבוניות/ניכויים; `follow_up_notes`. כל שורה מבודדת RLS.
- **לא נשמר בשרת:** UI חולף (`countme_companion_step`)→localStorage; `/demo`→dana-cohen מקומי.
- **migration:** מייסד עם persona מקומי → מסך חד-פעמי "ייבא לחשבון" (localStorage → upsert ל-DB).

## A12. Prompt caching — עומק (Anthropic, sonnet-4-6)
מאומת מול סקיל `claude-api`. עיקרון: **prefix match** — יציב קודם, תנודתי בסוף; סדר רינדור tools→system→messages.
- **מבנה ל-`/api/chat`+`/api/coach`:** בלוק 1 = `SYSTEM_EITAN` (זהות/כללים — **קבוע, משותף לכולם**) + `cache_control:{type:"ephemeral"}`; בלוק 2 = קונטקסט persona (יציב per-session) + breakpoint שני; שאלת המשתמש = **אחרי** ה-breakpoint האחרון.
- **מינימום sonnet-4-6 = 2048 טוקנים** (אחרת לא נשמר, בשקט). מקס' 4 breakpoints.
- **TTL:** 5 דק' (ברירת-מחדל, write ×1.25) מספיק לצ'אט; 1h (×2) לפערים ארוכים. reads ×0.1 → ~90% חיסכון + TTFT מהיר.
- **אסור (silent invalidators):** `new Date()` ב-system, JSON לא-ממוין, persona-id ב-prefix המשותף. "היום 2026" = מחרוזת קבועה.
- **אימות:** `usage.cache_read_input_tokens > 0`. (pre-warm `max_tokens:0` — תועלת נמוכה ל-3-5, לדלג.)

## Sequencing + worktrees · טכנולוגיה · routines · סקילים
- **worktree-safe (מקביל):** Phase 0 · Phase 1 · Phase 5 (עד חיבור הדשבורד) · brand-fixes · נכסי-שיווק.
- **single-track (מצומד):** Phase 2 (db+hook+13 דפים+API) · Phase 3+4 (auth+proxy).
- **סדר:** 0+1 → 2 → 3+4 → 5 → 6. כל phase shippable.
- **Routines לקידום:** `npm run build`+`tsc --noEmit` לפני push (ה-gate) · **SessionStart hook** (סקיל `session-start-hook`) ל-web-session · **/wrap-up** (קיים) · **code-review/security-review/verify** על כל PR · **/loop** למשימות חוזרות (ניטור CI).
- **סקיל→משימה:** מקדמות/1301/נק'זיכוי `israeli-tax-returns` · מע"מ `israeli-vat-reporting` · ב"ל `israeli-bituach-leumi` · חשבונית-ישראל `israeli-e-invoice`+`deep-research` · OCR `israeli-receipt-scanner`/`hebrew-ocr-forms` · ת"ז/KYC `israeli-id-validator` · פרטיות `israeli-privacy-shield` · תאימות-AI `israeli-ai-compliance-kit` · RTL/עיצוב `hebrew-tailwind-preset`/`israeli-ui-design-system`.

## סיכונים
- `middleware.ts` במקום `proxy.ts` → תקלה ב-16.2.4. *מיטיגציה:* `proxy.ts` + אימות מול docs.
- `cookies()` סינכרוני → תקלת build. *מיטיגציה:* server client `async`, תמיד `await createClient()`.
- שינוי חוזה `/api/chat` (הסרת persona) → שובר `chat-panel.tsx`. *מיטיגציה:* אותו commit.
- regression ב-`/demo` אם ינותב דרך auth. *מיטיגציה:* allow-list ב-proxy + localStorage.
- `usePersona` חייב `loading` אחרת skeletons נשברים. **Google OAuth** דורש Google Cloud project + redirect URIs ב-Supabase (creds בלבד) — לפני הפיילוט.

## אימות (verification)
1. `npm install` → `npx tsc --noEmit` → `npm run build` (webpack) עוברים (ה-gate).
2. לקרוא docs מותקנים של Next 16; להתאים params של `exchangeCodeForSession` ל-`@supabase/ssr`.
3. Supabase MCP: `list_tables` · `get_advisors` (RLS דולק) · אימות policies `auth.uid()=user_id`.
4. **בידוד RLS:** עם 2 JWT — A לא רואה/מעדכן את השורה של B (0 שורות). לפני נתונים אמיתיים.
5. scan ל-`.next`/client-chunks שה-service-role-key לא דלף.
6. **ידני (מכשיר אמיתי):** login במחשב+אייפון → `/dashboard`; חשבון חדש → `/setup`; persist אחרי logout/login; בידוד RLS גלוי; הסרגל במחשב (⌘R/I/Q/D, לא יורה תוך הקלדה) ובאייפון (FAB+safe-area); `/demo` בלי login.

---
# צירים ב׳-ו׳ (לא-טכני)
| ציר | מי | מתי | תוכן |
|---|---|---|---|
| **ב׳ משפטי** (קודם) | רוי + יעל + פרל כהן | תוכנית עד ~18.6 | פרטיות (תיקון 13/רישום מאגר), זכויות יוצרים, אישור ניהול פיננסי; **רישום ל-חשבונית ישראל כבית-תוכנה** (חינמי; A9). *מערכת מייצגים/שע"מ — רק אם נעבור להגשה בשמם.* + דגל קופי "מחליף רו"ח" |
| **ג׳ סייבר** | שי שוורץ | שבוע 3 (אחרי משפטי) | RLS, ניהול מפתחות, הצפנת PII, גיבוי, Pen-Test |
| **ד׳ תמחור** | חשב רוי | שבוע 4 (אחרי סייבר) | עלויות רחבה + השוואה מומנטום↔עכשיו. *קלט חסר: סלייד מומנטום* |
| **ה׳ שיווק** | תומי (CMO) | חי עד 7.7 | זהות ברף הקיצורים, פוסטים מכווני-קהל, אוטומציות. אפשר לסנכרן למבחנים/לשכה |
| **ו׳ ארגוני** | פ"ע | לאורך | הסכם מייסדים (אחוזים לפי שלבים/שנים + חלוקת הוצאות)→פרל כהן; ויתור ליה; רו"ח in-house (מאיה/EY→משימה #1); בע"מ אחרי פיילוט |

---
# משפטי, רישומים ורגולציה 🔲 לאשר מול יעל
> **פעולה מרכזית: בפגישת יעל לעבור על כל זה ולשאול "מה עוד?"**

## פרטיות + founders-first
- **founders-first:** self-test מייסדים עכשיו (מסכימים על הדאטה שלהם); external רק אחרי יעל. מסך הסכמה + הודעת-פרטיות (תוכן מ-`israeli-privacy-shield`). PII רגיש → RLS חובה, service-role בשרת בלבד, גיבוי, מחיקת-חשבון.

## דגל קופי "מחליף רו"ח" + מה אפשר עם/בלי רו"ח
- ⚠️ קופי דף הבית — **"מערכת AI שמחליפה את הרואה חשבון" / "בלי רואה חשבון"** — רגיש (גבול רו"ח↔AI, משימה #1), והפיילוט הוא companion (לא מייצג). **לתאם ניסוח מול יעל/פרל כהן/מאיה.**
- **בלי רו"ח (ליבת המוצר, self-service):** המשתמש ממלא 1301 לבד דרך companion; countme מחשב/מסביר; מועד מקוון 30.6; דיסקליימר "לא ייעוץ מקצועי". *(זה ה-"בלי רואה חשבון" של דף הבית.)*
- **עם רו"ח (היברידי, PDF §1):** רו"ח של החברה מייצג ומשדר ל-שע"מ דרך **ייפוי כוח** → הארכת-הגשה; דורש onboarding נפרד לייפוי-כוח (מנותק מ-ToS).
- ⚠️ **סתירה לפתור בקוד:** persona של איתן (`api/coach/route.ts`: "מחליף את הרו"ח") מול הדיסקליימרים ("התייעצי עם רו"ח") ב-`/coach`,`/dashboard`,`/alerts`,`/demo` — ליישר ניסוח אחיד תואם-משפטית.

## הפרדת אחריות אם מביאים רו"ח (בינינו לבינו)
מחבר למשימה #1 + פגישת מאיה/EY.
- **שכבת מוצר (AI):** מחשב/מסביר/מלווה/מכין. ToS מגביל ("companion, לא ייעוץ, לא מייצג").
- **שכבת רו"ח (אנושי):** סקירה/שיקול-דעת/חתימה → שם האחריות המקצועית (מבוטחת).
- **מודלים:** (א) רו"ח כסוקר/מאשר — *הכי נקי לפיילוט*; (ב) רו"ח כעובד/מייסד — תפקיד+אחוזים+ביטוח חברה; (ג) רו"ח חיצוני/EY — SLA+חלוקת אחריות.
- **בינינו לבינו:** מטריצת RACI (מוצר=יוני, פיננסי/רגולציה=רוי, שכבת רו"ח=?) בהסכם המייסדים.

## רישומים/אישורים מול הרשויות
| # | פריט | מתי | אחראי | הערה |
|---|---|---|---|---|
| R1 | רישום מאגר מידע (תיקון 13) | לפני PII חיצוני | רוי/יעל | אולי פטור לפי היקף — לאמת |
| R2 | אישור תוכנה לניהול חשבונות (נספח ה' + הו"ב 3/2003) | אם מנהלים/מוציאים חשבוניות | רוי+בודק-תוכנה+עו"ד | ראו מסמך software-approval |
| R3 | התממשקות חשבונית ישראל (Org+App, Client ID) | אם מוציאים חשבונית מעל סף | יוני | ספייק שבוע 1 (A9) |
| R4 | רישום כמייצג/שע"מ | **מחוץ לפיילוט** | — | עתידי (מודל היברידי) |
| R5 | ישות עסקית (עוסק/בע"מ) | בע"מ אחרי פיילוט | רוי | בכפוף למייסדים |

## פריטים משפטיים (מסמכים)
| # | פריט | אחראי | הערה |
|---|---|---|---|
| L1 | מדיניות פרטיות + מסך הסכמה | יעל/רוי | israeli-privacy-shield |
| L2 | תנאי שימוש + הגבלת אחריות | יעל/פרל כהן | "כלי מלווה, לא ייעוץ, לא מייצג" |
| L3 | הסכם מייסדים | פרל כהן | אחוזים/שלבים/הוצאות |
| L4 | הקצאת זכויות + ויתור ליה | פרל כהן | IP assignment |
| L5 | זכויות יוצרים/IP (קוד/לוגו/תוכן) | יעל | |
| L6 | DPA / sub-processors (Anthropic/Supabase/Vercel) | רוי | תיקון 13 + אי-אימון (PDF §4) |
| L7 | ביטוח אחריות מקצועית/cyber | רוי | עלות מול שי |

## מסמך משפטי לכתיבה → `docs/legal/software-approval.md`
> ב-plan mode אסור ליצור קבצים מלבד ה-plan; ייכתב ב-execution. מתווה:
- **בסיס דו-שכבתי:** נספח ה' (לשון החוק — דרישות טכניות) + הוראת ביצוע 3/2003 (נוהל קבלת מספר אישור).
- **דרישות נספח ה':** מספור עוקב רציף; **Audit-Trail** (אין מחיקה בלי עקבות); מרשם תוכנות אצל הנציב; "ספר לקוחות" (שם/כתובת/עיסוק/מס' עוסק/טלפון); תוקף 3 שנות-מס; סמכות סירוב/ביטול.
- **תהליך (הו"ב 3/2003):** הגשה למחלקת ניהול פנקסים → מספר אישור.
- **3 ארטיפקטים:** (1) טופס בקשה; (2) **תצהיר בודק תוכנה** (רו"ח/מנתח-מערכות חיצוני חותם מול עו"ד); (3) הנחיות תפעוליות (לאן להגיש, דיווח שדרוגי-גרסה, הדפסת מספר האישור על החשבונית).
- **אחראים:** רוי + בודק-תוכנה + פרל כהן.

## דרישות ה-PDF של רוי (Legal Compliance V2) — ✅ הוטמע
> תגיות: **[פיילוט]** נדרש · **[דחייה]** אחרי פיילוט · **[יש]** כבר בתוכנית.

**§1 רשות המסים / שע"מ**
- **רישום תוכנה** (בודק מוסמך → תצהיר תאימות [אי-מחיקה+מספור עוקב] → רישום בי-ם; מס' מודפס על כל מסמך) — **[דחייה]** רק כשמוציאים מסמכים חוקיים. ראו software-approval.
- **ייפוי כוח מקוון (היברידי)** — onboarding נפרד, חתימה דיגיטלית/פיזית, מנותק מ-ToS — **[דחייה]** למסלול מייצג.
- **חתימה אלקטרונית מוסדית** על PDF מקור (תעודה מאושרת) — **[דחייה]**.

**§2 פרטיות ואבטחה**
- **רישום מאגר מידע רגיש** + מינוי **CISO** — **[פיילוט-להחלטה]** founders-first עוקף; external דורש.
- **KYC צד-ג'** (Onfido/Au10tix: ת"ז+Liveness) — **[פיילוט-קל]** invite-only מספיק; KYC מלא לפני ציבורי.
- **הצפנה (rest+transit) + RLS + Pen-Test** — RLS **[יש]** (Phase 1); הצפנה Supabase by-default; Pen-Test → שי.

**§3 פיצ'רים — החרגות**
- **ProActive AI Guardian** (המלצות מס/פנסיה = ייעוץ ברישיון): החרגה ב-ToS + **דיסקליימר קבוע מתחת לכל התראה** — **[פיילוט אם נבנה]** כבר יש דיסקליימרים ב-`/alerts`/`/dashboard`.
- **Benchmark (שימוש משני)**: **Opt-In אקטיבי** בהרשמה; **אסור להתנות** שימוש בסיסי בו — **[דחייה]**.

**§4 חוזי/צרכני**
- **ToS עם פטור מלא** — **[פיילוט]** (L2). · **"ניתוק בקליק"** — **[פיילוט אם יש תשלום]**.
- **חוק הספאם** — הפרדת הרשאות+תשתית תפעולי↔שיווקי — **[פיילוט-חלקי]** (ציר ה׳).
- **DPA מול Anthropic** (אי-שמירה/אי-אימון) — **[פיילוט]** Anthropic by-default לא מאמן על ה-API; להסדיר zero-retention. (L6)

---
# המלצות התייעלות (small-spend / big-benefit)
1. **self-test מייסדים שבוע 1** — ₪0, אפס חשיפת-פרטיות, מאמת זרימה לפני שמשפטי נפתח.
2. **לא לעבור ל-Google Cloud hosting עכשיו** — Vercel+Supabase free-tier מספיקים ל-3-5 ב~₪0 (רק OAuth creds).
3. ⚠️ **Vercel Hobby = non-commercial** → פיילוט מסחרי דורש **Pro (~$20/חו׳)**. תשלום קטן, מונע ToS. ✅
4. **prompt caching** (A12) → עלות Anthropic ל-3-5 זניחה.
5. **דומיין מותג** (~₪40-60/שנה) לשיווק. ✅

# מה אני יכול לבצע ישירות (MCP מחובר)
Google Calendar (פגישות יעל/מאיה/שי/חשב) · Gmail (טיוטות) · Figma/Canva (נכסי שיווק + ויזואל קיצורים) · Vercel (פריסה+דומיין) · Supabase (סכמה+RLS) · GitHub (PRs). **פעולות החוצה — רק באישור.**

# קלטים שעוד חסרים (לא חוסם בנייה)
הוצאות נוכחיות (burn) · סלייד תמחור מומנטום · handles/דומיין שיווקיים · תשובת תומי על ניוד-דאטה · פירוט ה-UX ("האתר טרם מדויק").
