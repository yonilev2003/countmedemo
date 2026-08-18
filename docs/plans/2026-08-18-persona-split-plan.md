# תוכנית: פיצול persona blob — הוצאות/חשבוניות לטבלאות אמיתיות

**סטטוס:** תכנון בלבד (v2 §4.3 — `docs/plans/2026-08-18-master-task-list-v2.md:69`). לא מיושם.
**היקף:** רק `income.expenses[]` ו-`income.invoices[]` (כולל גבייה — ראו ממצא בסעיף 1).
כל השאר נשאר ב-blob. שער ההפעלה בסעיף 3.

## הבעיה, מקורקעת

`persistPersona()` (`src/lib/data/persona-store.ts:189-230`) → `upsertPersona()`
(`src/lib/data/persona-repository.ts:54-75`) כותב מחדש את **כל** `profiles.persona`
בכל שמירה, מ-9 אתרי קריאה מאומתים: `setup/page.tsx` (שלוש קריאות — אתחול/רה-נסיון/סיום
האשף), `expenses/store.ts:31,42`, `invoices/new/page.tsx:375`, `receivables/page.tsx:92,122`,
`year-switch.tsx:274`, `setup/assets/page.tsx:76`, `file/guided/page.tsx:76`,
ועטיפה גנרית ב-`use-persona.ts:66`. אין פג'ינציה, אין אינדקס — משתמש עם מאות רשומות
כותב שורת פרופיל של מאות KB בכל הוצאה בודדת.

**תקדים חשוב:** ב-2026-08-13 כבר הוסרו 6 טבלאות רלציוניות ריקות/לא-בשימוש שנוצרו לפני
שדפוס ה-JSONB התקבע (`supabase/migrations/20260813120000_drop_unused_relational_tables.sql`),
כולל `invoices`/`expenses`/`incomes`. שתי RPC-פונקציות למספור (`get_next_invoice_number`,
`get_next_doc_number`, `20260723120000_harden_numbering_rpcs.sql`) הפכו למתות בעקבות זה
ונמחקו ב-`20260816120000_drop_orphaned_numbering_rpcs.sql` — **המספור בפועל היום נגזר
צד-לקוח** מ-`persona.invoiceCounter`/`docCounters` (מתועד בהערת `20260723120000...sql:8`).
**אין לעשות resurrect לסכימה הישנה** — לתכנן מחדש מול הצורה בפועל של `ExpenseLine`/`InvoiceLine`.

## 1. סכימת יעד

**נשאר ב-blob** (קטן, נכתב לעיתים רחוקות — לא צריך טבלה): `personal`/`contact`/`business`/`bank`
(עריכה חד-פעמית/נדירה), `deductionsAndCredits`, `capitalDeclaration` (טופס 1219 — `setup/assets/page.tsx:76`,
פיצ'ר נפרד), `mikdamotPlan` (`forecast-card.tsx:263`), `monthlyBreakdown` (≤12 רשומות),
`invoiceCounter`/`docCounters` (שני סקלרים — **לא** מועברים לטבלה, ראו סיכון #1),
`totalRevenue`/`totalDeductibleExpenses` (הבייסליין הקיים — נשאר כפי שהוא, ראו סעיף 2).

**ממצא חשוב — "גבייה" היא לא ישות נפרדת:** `receivables/page.tsx` ו-`lib/receivables/summary.ts:63`
לא קוראים מטבלה/מערך נפרד — הם מסננים את `persona.income.invoices` לפי `docType` ומחשבים
`effectiveStatus` **בזמן ריצה** (לא מאוחסן — תיעוד מפורש ב-`persona.ts:59-61`). לכן טבלת
היעד היא **`invoices` אחת** (כל docType: tax-invoice-receipt/receipt/business-account/quote),
וגבייה נשארת query מסונן מעליה — בדיוק כמו היום, רק מול טבלה במקום מערך.

```sql
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, vendor_name text not null, description text not null default '',
  amount numeric(12,2) not null, vat numeric(12,2) not null default 0,
  category text not null, category_id text, receipt_path text,
  deduction_rule text not null check (deduction_rule in ('full','partial','depreciation')),
  partial_percent numeric(5,2), doc_number text,
  status text check (status in ('full','partial','needs_review')), business_purpose text,
  is_foreign_currency boolean not null default false,
  original_amount numeric(12,2), original_currency text, exchange_rate numeric(12,6),
  source text check (source in ('camera','gallery','file','voice','manual')),
  reviewed_by_user boolean not null default false,
  deleted_at timestamptz,  -- soft delete בלבד — שמירת 7 שנים (persona.ts:121)
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index expenses_user_date_idx   on public.expenses (user_id, date desc);
create index expenses_user_active_idx on public.expenses (user_id) where deleted_at is null;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,  -- "2024-0042" / "Q-..." / "BA-..." — persona.ts:64
  doc_type text not null default 'tax-invoice-receipt'
    check (doc_type in ('tax-invoice-receipt','receipt','business-account','quote')),
  date date not null, customer_name text not null, customer_tax_id text, description text,
  amount numeric(12,2) not null, vat numeric(12,2) not null default 0, total numeric(12,2) not null,
  category text, status text check (status in ('sent','paid')),
  due_date date, valid_until date, paid_date date, related_doc_number text,
  reminders_sent jsonb not null default '[]'::jsonb,  -- קטן מטבעו (persona.ts:88)
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);
create index invoices_user_date_idx    on public.invoices (user_id, date desc);
create index invoices_receivables_idx  on public.invoices (user_id, doc_type, status)
  where doc_type in ('business-account','quote');

-- אותו דפוס בדיוק כמו כל שאר הטבלאות: countme_init.sql:153-172 (for-all, auth.uid()=user_id)
alter table public.expenses enable row level security;
alter table public.invoices enable row level security;
create policy expenses_own on public.expenses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoices_own on public.invoices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

שנת מס לא מקבלת עמודה נפרדת — `isInTaxYear` (`p-and-l/index.ts:70-72`) בודק prefix של
המחרוזת (`iso.startsWith(String(year))`), כלומר שנה קלנדרית = שנת מס; שאילתות מסננות
לפי `date` ישירות (`extract(year from date)` / טווח תאריכים) לשמירת אותה סמנטיקה בדיוק.

## 2. אסטרטגיית דואל-רייט

**שלב A.0 — תנאי-סף לפני dual-write:** ל-`expenses` כבר יש תפר אחד (`lib/expenses/store.ts`
— `addExpense`/`softDeleteExpense`). ל-`invoices` **אין** — הכתיבה מפוזרת ב-3 מקומות: יצירה
(`invoices/new/page.tsx:349-376`), סימון-שולם ותזכורת (`receivables/page.tsx:75-99,101-123`).
לפני dual-write לחלץ `src/lib/invoices/store.ts` (מראה `expenses/store.ts`: `addInvoice`,
`markInvoicePaid`, `logInvoiceReminder`) ולהעביר את שלושת האתרים אליו — ריפקטור בלי שינוי
התנהגות, לפני A.1.

**שלב A — dual-write (blob עדיין מקור האמת, קריאה לא משתנה):** בתוך 5 הפונקציות (עכשיו כולן
ב-2 קבצי store) — אחרי `persistPersona(next)` הקיימת, insert/update מקביל בטבלה החדשה,
**מאחורי flag** (`PERSONA_TABLES_DUAL_WRITE_ENABLED`, כבוי כברירת מחדל — דפוס `BILLING_ENABLED`
ב-`.env.template`). כישלון בכתיבת הטבלה **לא** חוסם את שמירת ה-blob — נבלע ונרשם ללוג, כמו
`unavailable` ב-`src/lib/chat/history.ts:44,57,76` (כשל אחד מכבה את מסלול הטבלה לכל שאר
הבקשה, בלי לזרוק). כל 5 הפונקציות עוברות דרך 2 store-ים בלבד — זו הנקודה שהופכת את שלב B
ל-**שינוי repository אחד**, לא שינוי UI.

**שלב B — backfill + read-switch מאחורי flag:** סקריפט חד-פעמי (idempotent) שקורא
`profiles.persona->income->expenses/invoices` לכל המשתמשים וממלא את הטבלאות. אחריו — אדפטר
קריאה: `assemblePersonaIncomeFromTables(userId, blobIncome)` מחזיר אותה צורת `PersonaIncome`
בדיוק (`persona.ts:208-224`) עם `expenses`/`invoices` מהטבלאות במקום מהמערך; שאר השדות
(`totalRevenue`, `mikdamot`, `monthlyBreakdown`...) ממשיכים מה-blob. `syncPersonaFromDbUncached`
(`persona-store.ts:312-366`) קורא לאדפטר במקום ל-`remote.income.expenses/invoices` ישירות
כשה-flag דלוק. **`decidePersonaOwnership` לא משתנה** (`persona-store.ts:86-111`) — פועל על
אובייקט `Persona` שהצורה שלו זהה; לא יודע ולא צריך לדעת מאיפה הגיעו השורות.

**שלב C — הפסקת כתיבת המערכים ל-blob:** אחרי תקופת ניטור ללא סטיות (סעיף 3), מסירים את
חצי-הכתיבה ל-blob מה-2 store-ים, ומריצים מיגרציה שמאפסת `income.expenses`/`invoices` בכל
השורות הקיימות (מקטין את גודל השורה בפועל — זו כל הנקודה). `invoiceCounter`/`docCounters`
**נשארים ב-blob** גם בשלב C — שני סקלרים, לא שווה להחיות RPC מת בשבילם (סיכון #1).

## 3. שערי הפעלה, מאמץ, בדיקות

**שער הפעלה:** לא זמן קבוע — מדד. `docs/plans/2026-08-18-master-task-list-v2.md` שלב 3.2
כבר מתכנן דייג'סט יומי (Vercel Cron מעל `events`+`ai_usage`) ושלב 3.4 עמוד `/admin` — להוסיף
לשניהם שאילתה: `select user_id, jsonb_array_length(persona->'income'->'expenses') as n
from profiles order by n desc limit 20;` (ואותו דבר ל-`invoices`). סף הפעלה: משתמש ראשון
שחוצה **~200 שורות** במערך אחד (המספר מ-v2 §4.3 עצמו — `master-task-list-v2.md:69`), **או**
סיום הבטא (המוקדם מביניהם, כמו שנעול שם).

**מאמץ (גס):** A.0 (חילוץ store לחשבוניות) — יום. A (dual-write + flag) — 1-2 ימים.
מיגרציית SQL (טבלאות+RLS+אינדקסים) — חצי יום + החלה ידנית על `hbsgz` (MCP לא מגיע לפרויקט,
כמו כל מיגרציה אחרונה — `memory/decisions.md:62`, אותה מגבלה כמו `ai_usage.sql:18-19`).
Backfill script — יום (כולל בדיקת idempotency). B (אדפטר + read-switch) — 2 ימים.
ניטור מקביל (סעיף הבא) — שבוע לפני C. C (ניקוי) — חצי יום.

**אסטרטגיית בדיקות:** הבדיקות הזהובות הקיימות (`field030-field137-golden.test.ts`,
`effective-deductible.test.ts`, `receivables.test.ts`) בונות `Persona` דרך `makePersona()`
(`tests/unit/helpers/persona-factory.ts:16`) — אובייקט ב-memory, לא תלוי DB. הן **לא**
משתנות בשלבים A/B/C ומשמשות כרשת-ביטחון ל"הצורה לא זזה". בנוסף: (1) בדיקת יחידה על האדפטר
עצמו — blob עם N שורות מול טבלאות עם אותן N שורות → תוצאה זהה bit-for-bit; (2) לפני הדלקת
flag ה-read-switch בפרודקשן, סקריפט diff חד-פעמי שמריץ את מחשבוני ה-8 star fields
(`lib/calculators/index.ts`) על כל persona אמיתי גם מול blob וגם מול האדפטר ומשווה — זו
הערובה ש-B לא שינתה מספר בפועל, לא רק טסט יחידה מלאכותי.

## 4. מחוץ לתחום + סיכונים

**מחוץ לתחום:** `capitalDeclaration`/טופס 1219 (ישות נפרדת, קטנה, לא צומחת כמו expenses/invoices).
`personal`/`business`/`contact`/`bank`/`deductionsAndCredits` — נשארים blob לצמיתות (זו בדיוק
ההגדרה של "קטן, נכתב לעיתים רחוקות"). טבלאות billing/plans/subscriptions — משוריינות
(`CLAUDE.md` §Payments, "אין לנו API של טרנזילה"). אין שינוי לסכמת האימות/RLS הקיימת מעבר
לשתי הטבלאות החדשות.

**סיכונים:**
1. **מספור מקבילי (race)** — המספור נגזר צד-לקוח מ-`invoiceCounter`/`docCounters`
   (`invoice-generator/index.ts:6,24`) גם אחרי המעבר; שתי טאבים פתוחים יכולים לייצר אותו
   מספר. ה-`unique (user_id, invoice_number)` בטבלה יתפוס את זה בכתיבה (409/conflict) —
   אבל אין כרגע UI שמטפל בהתנגשות. תוכנית ה-RPC המת (`20260723120000...sql`) פתרה בדיוק
   את זה עם `pg_advisory_xact_lock` — לשקול להחיות גרסה מותאמת שלה **רק** אם race מתגלה
   בפועל, לא מראש.
2. **Backfill חלקי/כפול** — אם ה-script רץ פעמיים או נופל באמצע, `unique (user_id, invoice_number)`
   ימנע כפילות חשבוניות אבל אין מפתח טבעי מקביל להוצאות (אין `docNumber` חובה — `persona.ts:105-106`
   הוא `?`) — לתכנן מפתח backfill מפורש (למשל hash של date+vendorName+amount+index-במערך)
   לפני הרצה, לא ad-hoc.
3. **RLS על טבלה חדשה = משטח בדיקה חדש** — סעיף האבטחה ב-`CLAUDE.md` ("Security: Supabase")
   דורש בדיקת מדיניות עם anon **וגם** JWT משתמש אמיתי לפני שנתונים אמיתיים נכנסים; זה חל
   במלואו על שתי הטבלאות החדשות, לא רק תוספת.
4. **MCP לא מגיע לפרויקט hbsgz** — כל מיגרציה כאן (בדומה ל-`ai_usage.sql`) תיכתב אך תיושם
   ידנית ע"י יוני; לתכנן זמן לכך בכל שלב שכולל SQL.
5. **דואל-רייט מוסיף לטנסיה, לא רק כתיבה** — כל insert חדש הוא round-trip רשת נוסף על
   שמירת ה-blob הקיימת; ל-`/expenses/new` (זרימת "artifact-first" עם counter בזמן-אמת —
   `CLAUDE.md` §Artifact-first UX) יש רגישות UX לחביון שמירה — למדוד לפני הפעלה למשתמשים.
