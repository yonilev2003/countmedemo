# status — איפה אנחנו עכשיו

> עודכן: 2026-07-02 (ערב, אחרי merge של PR #23 ל-main) · הסבב הבא: תפעול + UX.

## 🎯 הסשן הבא — תדריך פתיחה (לקרוא לפני הכל)

**מה מוזג וחי ב-main:** מנוע מס עם 94 golden tests + 18 e2e, CI gate על כל PR ל-main, security headers,
rate-limiter, קופי מכויל, runbooks ב-`docs/runbooks/2026-07-02-yoni-supabase-waf.md`.

**חוסם #2 — Supabase MCP: ✅ נסגר (02/07 לילה).** חובר ב-OAuth; "list tables" מחזיר **12 טבלאות**
= בדיוק כל הטבלאות מ-3 המיגרציות (8 init + 3 billing + 1 events; ה"13" בדוח WS7 היה ספירה שגויה) ⇒
**מיגרציות billing+events ככל הנראה כבר הוחלו על hbsgz.** כל הטבלאות ריקות ⇒ אין עדיין דאטה אמיתי
של משתמשים — **חלון הזדמנות: לבצע PII-minimization (תוכנית WS7) עכשיו, לפני שקיים דאטה להעביר.**
נותר לוודא: `select * from plans` — אם ריק, ה-seed לא רץ → להריץ שוב את מיגרציית billing (idempotent).

**חוסם #1 — גייטינג עדיין כבוי (נבדק 3 פעמים, האחרונה 02/07 לילה: /dashboard → /setup).**
ה-middleware תקין — לא לגעת בו. סדר האבחון מחר:
1. **החשד המרכזי — הפרויקט הכפול ב-Vercel:** קיימים שני פרויקטים שבונים את הריפו. הקנוני הוא
   **`countmedemo` תחת `yonilev2003s-projects`** (מארח את `countmedemo-eight.vercel.app`).
   ייתכן שהמשתנה הוגדר בפרויקט הכפול (`countmes-projects`) — לוודא שעורכים את הנכון!
2. במשתנה: הערך בדיוק `true` (בלי רווחים), מסומן **Production**, ואז **Redeploy מפורש** (env לא חל בלי).
3. בדיקה: גלישה בסתר `/dashboard` → חייב `/login`. אם עדיין `/setup` אחרי redeploy מאומת —
   רק אז לפתוח debug (שורת header זמנית ב-middleware שחושפת את מצב הדגל).

**Backlog הסשן הבא (לפי סדר):**
1. סגירת חוסמים 1+2 + WAF rules + branch protection — הכל ב-runbooks.
   ⚠️ ב-branch protection, ה-required status checks הם שמות ה-**jobs** בדיוק: `build-and-unit` ו-`e2e`
   (לבחור מהרשימה המוצעת, לא להקליד ידנית). "ci / build-and-unit" שמוקלד ידנית לא יתאים לעולם
   ויחסום כל merge ב-"Expected — Waiting" (קרה ב-02/07, תוקן).
2. **ביקורת חווית-לקוח מלאה (בקשת יוני 02/07):** אין עמוד מדיניות-פרטיות · אין עמוד תנאים/הסתייגויות
   משפטיות (בעיקר התנערויות) — ה-scope statement המוכן ב-`docs/reviews/2026-07-02-ws8-copy-audit.md` הוא
   הבסיס · התמדת סשן (להישאר מחובר; לחיצה על הלוגו לא מנתקת/מאבדת מצב) · ליטוש חוויה כללי.
3. **פערי דומיין שהעלה יוני (WS3 מתחיל להיפתח):**
   (א) **הכנסות שאינן מיגיעה אישית — פער כפול (intake + מנוע), עם הפרדת 2025/2026 מובנית:**
   · מה זה כולל (לפי הסקיל israeli-tax-returns, references/tax-brackets-credits.md): שכ"ד למגורים
     ב-3 מסלולים (פטור עד 5,654 ₪/חודש — קפוא 2025–2027 · 10% מהברוטו · שולי עם ניכוי הוצאות),
     רווחי הון מני"ע (25% / 30% לבעל מניות מהותי, טפסים 1322/1325), ריבית/דיבידנד.
   · שינוי 2026 שכבר בסקיל: **מס יסף דו-שכבתי** — הכנסה פסיבית מעל 721,560 ₪ חייבת 5% (לא 3%);
     המנוע הנוכחי ממדל רק 3% על הכנסה אקטיבית — נכון להיום, כי המוצר לא מחשב פסיבי בכלל.
   · מצב בקוד: הסכימה מציגה שדות (schema.ts:386-501: ריבית/דיבידנד/שכ"ד/רווח הון), field-032 מחושב,
     אבל **הוויזרד לא שואל** (step 4 = מחזור עסקי בלבד) ו-estimateTaxLiability לא מחשב מס פסיבי
     (שיעורים שונים לגמרי מהמדרגות!).
   · איך בונים: intake בוויזרד (שאלות שכ"ד/רווח הון/ריבית) → קבועים year-keyed חדשים ב-types.ts
     (rentalExemptCeiling, rentalFlatRate, capitalGainsRate, surtaxPassiveRate...) באותו מנגנון
     getTaxYearConstants שכבר מפריד 2025/2026 → מחשבונים טהורים + golden tests. הסקיל מכסה את שתי
     השנים; אימות מקורות ראשיים לפני קידוד — כרגיל.
   (ב) תגמולי מילואים לעצמאי (ב"ל, לא מס): הסקיל israeli-bituach-leumi מכסה תגמול בסיס (טפסים 502/509,
   מחשבון 2026) אבל הגדרת "עצמאי" הזכאי + תוספות הוראת-השעה (25%/40% שיוני ציין) לא מאומתות ולא במוצר —
   לאמת מול btl.gov.il לפני מידול. המוצר כיום מכסה רק את צד המס של מילואים (תיקון 283).
4. `npm audit fix` — יום שקט: ענף חדש → `npm audit fix` (בלי --force!) → `npm run build && npm test` →
   PR רגיל דרך ה-CI. השאריות (postcss/tmp בתוך next) אין להן fix לא-שובר — לא לגעת עם --force.
5. סקילים 2025/2026: הקבצים המקומיים ב-`.claude/skills/` הם snapshot בשליטתנו (לא מתעדכן מעצמו — זה
   פיצ׳ר, לא באג); האמת למספרים היא `lib/calculators/types.ts` + provenance, וסוכן הרגולציה (WS5, רץ יומית)
   הוא מנגנון העדכון. אין צורך ב-RAG חדש — אפשר להוסיף לסוכן מקור שעוקב אחרי עדכוני קטלוג הסקילים.

**הבהרה למונח FLAG(Roy):** סימון בקוד (`lib/calculators/types.ts`) על קבועי-מס שטרם אומתו ע"י רועי
(co-founder) — לא תכנון פיננסי אישי של יוני. אין קשר ל-Obsidian.

**פרטים שטרם התעמקנו בהם (זוהו בסריקת-עומק 02/07 לילה — לטפל בסשן הבא):**
- **סיכון פיצול מס-בריאות (intake):** שדה 030 מנכה 52% מ-`annualPaid` בהנחה שזה רכיב הב"ל בלבד,
  אבל הוויזרד שואל "כמה שילמת לביטוח לאומי" — משתמש אמיתי יקליד את הסכום המשולב מהשובר (ב"ל+בריאות)
  → ניכוי מנופח. FLAG קיים ב-persona.ts; הפתרון: לפצל את השאלה בוויזרד או להסביר ליד השדה.
- **Preview deployments עוקפים גייטינג:** אם `AUTH_GATING_ENABLED` מוגדר רק ל-Production, כל Preview
  (כולל של הפרויקט הכפול!) נשאר פתוח עם מפתחות אמיתיים — לסמן את המשתנה גם ל-Preview, ולוודא
  שלפרויקט הכפול אין `ANTHROPIC_API_KEY` משלו (כפל חשיפת תקציב).
- **זיכוי ביטוח חיים ללא תקרה:** תוקן ל-25% אבל תקרת 45א טרם ממודלת → בפרמיות גבוהות התצוגה
  עלולה להפריז בזיכוי (confidence=medium + הערה קיימת). FLAG(Roy) לתקרה.
- **מדרגת-כניסה 20 ימים למילואים 2027** — לא ממודלת בכוונה (טבלה רשמית טרם אושרה); לוודא בסוכן הרגולציה.
- **הפרויקט הכפול ב-Vercel** — מעבר לבלבול, הוא שורף builds כפולים ועלול להיות מקור תקלת הגייטינג. לנתק.

## 🏗️ סבב 02/07 — hardening לפני משתמשים (build ירוק, tsc נקי, 80/80 golden tests)

- ✅ **WS4 מנוע דטרמיניסטי מוכח:** vitest + 80 golden tests (מדרגות 2025+2026 ±1₪, מס יסף, נק' זיכוי,
  תקרות, תרומות, מילואים). כל קבוע-מס עכשיו ב-`types.ts` בלבד. **תיקוני דיוק (מאומתים, מקורות בקוד):**
  רצפת תרומות 200→**207 ₪** + תקרת 30% מהכנסה חייבת · זיכוי ביטוח חיים 5%→**25%** (45א) ·
  ceiling-alert לא מכריז "חרגת" ב-99.999% · תקרת זעיר ב-setup עכשיו year-keyed · סולם מילואים בסקיל תוקן.
- ✅ **WS2 אבטחה:** security headers (+CSP report-only) · auth על ה-API tied ל-`AUTH_GATING_ENABLED` ·
  rate-limiter משותף (user-id/platform-IP, לא XFF) · magic-bytes ב-upload · **next 16.2.4→16.2.10** (advisories).
- ✅ **WS5 סוכן רגולציה:** cross-ref ≥2 מקורות/מקור-ראשי + patch-proposal (diff ל-types.ts באישיו, human-merge).
- ✅ **WS8 קופי:** `<LegalNote>` אחד במקום 8 באנרים · פרומפט איתן לא "מחליף רו"ח" · aligned "מחשבון מדויק. לא ייעוץ מס."
  **הכל DRAFT — סקירה משפטית חיצונית (02/07: אין יותר יעל; פערים משפטיים מרוכזים ברשימה בסוף כל פלט AI).**
- ✅ **WS6/WS1:** טוקנים due-ink/alert-ink · `brand/colors.ts` לגרפים · `ils()` אחד · dead exports הוסרו.
- 📄 **דוחות ב-`docs/reviews/2026-07-02-*`:** WS1+WS2 (must-fix list) · WS7 Supabase (7 טבלאות מתות, PII plan) ·
  WS8 audit · WS9 learning-loop · WS5 demo.
- ⚠️ **נשאר חוסם (בעלים):** gating=true (יוני) · מיגרציות billing+events על hbsgz (יוני/רוי — MCP לא רואה את hbsgz) ·
  Tranzila webhook signature לפני BILLING_ENABLED · PII minimization לפני משתמשים-לא-מייסדים (תוכנית ב-WS7) ·
  testimonials פיקטיביים בדף הבית (שיקול יוני) · FLAG(Roy): תקרות פנסיה 25,608/12,804, רצפת תרומות 2026.

---

> עודכן: 2026-06-20 · ענף עבודה: `claude/beta-launch-prep-z2m6f5` · ספרינט הכנה-לבטא פעיל.
> מקור-אמת: `docs/launch/status-vs-plan.md` (סטטוס A–H) + `docs/launch/sprint-checklist.md`.

## 🏃 ספרינט בטא — סטטוס A–H (2026-06-20)
A 🟡30% · **B ✅90%** · **C ✅95%** · **D 🟡60%** · E ✅95% · F 🟡20% (PWA done) · **G ✅100%** · H ✅95%.
**build ירוק, tsc נקי, 32 routes.**

נסגר בסשנים האחרונים: G (מילואים מלא, N-1, סולם עד 4.0, צפי), C (1219: `/file/1219` + `/setup/assets` +
דוגמת דנה נטו ₪1,085,000), B (routes `/api/billing/{checkout,webhook}` idempotent + `requirePlan` + CTA),
D (add-to-calendar; chat rate-limit/ולידציה + error boundaries כבר היו), A (motion: dashboard Reveals + 1219 CountUp).

- ✅ **יישור Supabase:** ה-backend האמיתי = **`hbsgzelipeawkvtcazdr`** (akfg ננטש — חשבון אחר ש-MCP רואה).
  ה-MCP לא רואה את hbsgz → **billing+events צריך להריץ ידנית ב-SQL Editor של hbsgz** (SQL מוכן; ראה `connect-supabase-hbsgz.md`).
- **נשאר:** A/F ליטוש ויזואלי (דורש עין על הדיפלוי) · D תזכורות-מייל (צריך תשתית שליחה) · תנאים: SQL על hbsgz, טרנזילה חי, פרטיות (יעל).

---

> עודכן: 2026-06-10 · ענף: `main` (פרודקשן חי) · פיילוט SaaS חי ב-`countmedemo-eight.vercel.app`.

## מצב — פיילוט חי בפרודקשן 🟢
ב-10.6 עברנו מ-דמו-localStorage ל-**פלטפורמת SaaS חיה ומאובטחת**. **10 PRs מוזגו ל-main, אפס שבירות.**

- ✅ **Backend חי:** Supabase (פרויקט `hbsgzelipeawkvtcazdr`) + Google OAuth (עובד) + persona per-user ב-DB + RLS.
- ✅ **כיול 2025:** נק' זיכוי 3.25, מע"מ דינמי 18%, מספרי-ברזל ב"ל 2025 (90,264/588,360 + פיצול בריאות), מילואים 30/40/50, 6111 256,410 ללא מע"מ.
- ✅ **מוצר/מיצוב:** עוסק יחידים-בלבד (זעיר/פטור/מורשה), **"עובדות לא עצות"**.
- ✅ **עיצוב:** /login+landing+chat מיושרים ל-handoff + **chat SaaS rail**.
- ✅ **אבטחה:** persona DB-authoritative + תיקון דליפה בין-משתמשים.

## ⚠️ Gating עדיין כבוי
ה-auth-gating **בנוי ומוכן בדגל** (`AUTH_GATING_ENABLED`) אבל **כבוי** — האפליקציה עדיין פתוחה (לא "נעולה"). הדלקה = פעולה ידנית של יוני.

## חסום — ממתין
| נושא | חסום על | מה צריך |
|---|---|---|
| **הדלקת gating** | יוני (ידני) | `AUTH_GATING_ENABLED=true` ב-Vercel + redeploy |
| **self-test מייסדים** | יוני/תומי/רוי | כניסה חיה /login → auth → חשבונית → אימות 18%+בידוד |
| **חשיפה חיצונית/EY** | יעל (משפטי) | אישור פרטיות/ToS/קופי לפני external |
| **NEEDS-ROY 2025** | רוי | תקרות פנסיה (25,608/12,804), פיצול מס-בריאות, מילואים מול תיקון 283 |

## פתוח (לא חוסם)
- design-review של המסכים החדשים (login/landing/chat) — עין אנושית.
- ריבוי-חשבונות: Supabase (`hbsgz` מול `akfg`) + Vercel (`countmedemo-eight` מול `countmes-projects`) — לסדר בהמשך.
- refactor DB-only (הסרת localStorage) — מסומן, אחרי שה-gating חי ומוכח.

## נקודות-כניסה לקוד החדש
| נושא | קבצים |
|---|---|
| Supabase clients | `src/lib/supabase/{client,server,admin,proxy}.ts` |
| שכבת-נתונים DB | `src/lib/data/{persona-repository,persona-store,use-persona}.ts` |
| auth | `src/app/login/*`, `src/app/auth/*`, `middleware.ts` |
| דשבורד device-adaptive | `src/app/dashboard/page.tsx`, `src/components/dashboard/*` |
| קבועי-מס 2025 | `src/lib/calculators/types.ts` (`getTaxYearConstants`) |
| audits/אסטרטגיה | `docs/audit/*`, `docs/gtm/readiness.md`, `docs/spikes/*` |
