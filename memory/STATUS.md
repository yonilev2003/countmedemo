# status — איפה אנחנו עכשיו

> עודכן: 2026-07-02 · ענף עבודה: `claude/tax-product-architecture-9s3gyk` · סבב ארכיטקטורה/אבטחה/דיוק.

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
