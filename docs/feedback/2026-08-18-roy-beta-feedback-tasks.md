# משוב בטא — רוי + הודעת-השיתוף לחברים (18/08/2026)

מקור: צילומי-מסך WhatsApp מיוני — (1) ההודעה ששלח לחברים עם הקישור, (2) הערות רוי משימוש
בטלפון (17:11–17:32). כל הערה תורגמה למשימה מקורקעת בקוד (file:line) ע"י 9 סוכני-מחקר +
אימות ידני. הכרעות-מוצר של יוני (AskUserQuestion, 18/08) משולבות למטה ומתועדות גם
ב-`memory/decisions.md`.

## הכרעות יוני (18/08) — קובעות את הביצוע

| שאלה | הכרעה |
|---|---|
| "פירוט הכנסות/הוצאות כל אחד בעמודים שלו" | **לקשר את /invoices ו-/expenses הקיימים ללחיצה על שדות מחושבים ב-/demo** (מימוש ההבטחה "לחץ לראות פירוט") |
| מסך הסיום של /setup (שורש הבאג של רוי) | **מסלול אחד שתמיד שומר** — כפתור סיום יחיד: התחברות + שמירה בענן, עם חיווי "נשמר בענן" |
| מסלול אפליקציה נייטיבית | **Capacitor — שתי החנויות** (מחליף את ברירת-המחדל הרכה "PWA+Play קודם"; revisitable) |
| היסטוריית שיחות | **כמה שיחות עם רשימת-צד** (chat_threads + chat_messages, כמו במוקאפ "שיחות אחרונות") |

## Goal של הסבב (הגדרת יוני)

בטא נוח, חלק, בלי תקלות: **בלי קפיצות בין דפים** (הבהוב-דשבורד, מעברי-מסך קשים) **ועם
שמירת דאטה אמינה** (אף אחד לא נרשם פעמיים, שום נתון לא הולך לאיבוד). רוב המשתמשים במובייל —
מובייל תחילה. בדיקה עצמית חוזרת עד עמידה ב-goal, ואז בדיקת-דפדפן כ-5 עוסקים שונים.

---

## P0 — שמירת דאטה + קפיצות (הבאגים של רוי)

| # | משימה | קבצים | מקור במשוב |
|---|---|---|---|
| 1 | **כפתור-סיום יחיד ב-/setup שתמיד שומר.** היום רק "התחברות עם Google" (`setup/page.tsx:545-562`) מסמן `markPersonaContinueIntent()`; "כניסה ללוח הבקרה" (564-567) מנווט בלי לשמור → useRequiredPersona לא מוצא נתונים ומחזיר ל-setup. איחוד לכפתור אחד; לשמור על חוזה `decidePersonaOwnership()` (החלטה נעולה 18/08 — לא מחלישים הגנת דליפת-session) | `src/app/setup/page.tsx`, `src/lib/data/persona-store.ts` | רוי: "דשבורד לשנייה וקפיצה לפרטים אישיים" |
| 2 | **חוסן כוונת-השמירה מעבר ל-sessionStorage.** הדגל חד-פעמי ותקף רק באותו טאב — נשבר ב-OAuth בטאב חדש (נפוץ במובייל). להעביר גם דרך `next` param ב-callback | `src/lib/setup-storage.ts`, `src/app/auth/callback/route.ts`, `src/lib/data/persona-store.ts` | רוי: "לא זכר אותו בכניסה חדשה" |
| 3 | **חיווי הצלחה/כישלון על השמירה לענן.** `upsertPersona()` בולע כל שגיאה בשקט (`persona-repository.ts:54-75`). להציג "נשמר בענן" / שגיאה | `src/lib/data/persona-repository.ts`, `src/app/setup/page.tsx` | רוי + קופי "שמירה בענן" שלא קרה |
| 4 | **לתקן את הבהוב-הדשבורד.** `useRequiredPersona` מציג skeleton ואז `router.replace("/setup")` — עם משימות 1-2 הבאונס נעלם לגמרי למשתמש ששמר; לוודא שה-skeleton לא נראה כ"דשבורד לשנייה" | `src/lib/data/use-required-persona.ts` | רוי: "שנייה בדשבורד וקפץ אוטומטית" |
| 5 | **התנתקות מכל עמוד.** `SignOutButton` קיים רק ב-/home, /dashboard, /dashboard/pro (אומת ידנית). להוסיף לכותרות של /demo, /coach, /expenses, /invoices, /receivables, /setup | כותרות העמודים | רוי: "להתנתק רק דרך עמוד הדשבורד" |
| 6 | **קופי מדויק במסך הסיום.** "שמירה בענן, מכל מכשיר" יבטא את מה שבאמת קורה אחרי משימה 1 | `src/app/setup/page.tsx` | רוי: "למה זה לא שמר אוטומטית?" |

### פעולות ידניות של יוני (לא ניתנות לביצוע מהריפו — משפיעות על "נרשם כמה פעמים")
- [ ] **Supabase console:** לוודא ש-Redirect URLs כולל `https://countmedemo-eight.vercel.app/auth/callback` ו-Site URL נכון (פתוח מ-03/08 ב-`memory/STATUS.md:184-186`; תסמין "התחברתי פעמיים" מתועד ב-`src/app/page.tsx:24-34`)
- [ ] **Google Cloud console:** האפליקציה ב-Testing mode — לוודא שרוי וכל בודק נוסף ברשימת Test users (`docs/launch/oauth-branding.md:24-37`)

## P1 — מובייל + חלקות מעברים

| # | משימה | קבצים |
|---|---|---|
| 7 | **הגריד הקשיח של טופס-1301 במובייל.** `gridTemplateColumns: "1fr 28px 140px 36px"` בכל שורה + `overflow-hidden` חותך תוכן — הטופס בפועל desktop-only. ריספונסיביות אמיתית ב~360-390px | `src/components/form-1301/govil-section.tsx`, `form-preview.tsx` |
| 8 | **הצ'אט ב-/demo קבור מתחת לטופס במובייל** + באג `100vh` (קפיצת גובה עם שורת-הכתובת). טוגל/bottom-sheet צף לצ'אט במובייל + מעבר ל-`100dvh` | `src/app/demo/page.tsx` |
| 9 | **מעברי-מסך באשף /setup** — היום החלפת-DOM מיידית בין 7 מסכים; לעטוף ב-Reveal (קיים, reduced-motion-aware) | `src/app/setup/page.tsx`, `src/components/brand/motion.tsx` |
| 10 | **מעברי-route רכים** — אין AnimatePresence/View Transitions/loading.tsx בכלל; להוסיף שכבת מעבר עדינה | `src/app/layout.tsx`, `src/components/brand/motion*.tsx` |
| 11 | **פסיקים בכל המספרים.** רוב המשטחים כבר עם `toLocaleString("he-IL")` (אומת); לסרוק ולתקן את החריגים + תצוגת אלפים בשדות-קלט של האשף | סריקה רוחבית |

## P2 — פיצ'רים מהמשוב

| # | משימה | קבצים |
|---|---|---|
| 12 | **"לחץ לראות פירוט"** — לקשר שדות 150/238 ב-InteractiveValue אל /invoices ו-/expenses (הכרעת יוני) | `src/components/form-1301/interactive-value.tsx`, `src/lib/calculators/index.ts` |
| 13 | **היסטוריית שיחות עם רשימת-צד** — מיגרציה `chat_threads`+`chat_messages` (RLS `auth.uid()=user_id`), שמירה מהראוטים, טעינה ב-mount, רשימת-צד ב-ChatNavSideRail (המוקאפ כבר מגדיר את העיצוב). ⚠️ MCP לא רואה את hbsgz — המיגרציה גם ל-`docs/launch/hbsgz-pending.sql`, וה-UI חייב לעבוד גם כשהטבלה עוד לא קיימת | `supabase/migrations/`, `src/app/api/chat|coach/route.ts`, `src/components/agent/*` |
| 14 | **מצלמה מעבר להוצאות** — camera capture קיים רק ב-/expenses/new; להרחיב לסלוטים של /setup step-0 דורש גם נתיב-image ב-backend (היום PDF-only). לא חוסם-בטא | `src/components/upload/document-upload.tsx`, `src/app/api/upload/route.ts` |
| 15 | **Capacitor (הכרעת יוני: שתי החנויות)** — עדכון ההחלטה ב-memory + ביקורת browser-only APIs (Web Speech, boi.org.il fetch, sw.js). הסקאפולד המלא (ios//android/) — סשן נפרד, לא בסבב-הבטא | `memory/decisions.md`, ביקורת בלבד |

## P3 — נכונות חישובית (מסקנות סוכן-המס; לא חוסם בטא)

| # | משימה | סטטוס |
|---|---|---|
| 16 | שדות 030+137 **מחשבים נכון** (אומת צעד-צעד מול הקבועים; 22,340×52%=11,617 תואם לפרסונה) — אבל אין טסטים ישירים לשני המחשבונים. להוסיף golden tests | בטוח לביצוע |
| 17 | `aliyahDate` מסומן חובה ויזואלית אך לא נאכף ב-`validateStep2` (בניגוד ל-dischargeDate) | בטוח לביצוע |
| 18 | שדה 044 מתעלם מ-aliyahDate (תמיד שנה-1) — `FLAG(Roy)` קיים, Tikun 262 "ממתין לאישור רוי" | **ממתין לרוי** |
| 19 | האם עוסק-זעיר שולל גם ניכוי קרן-השתלמות (137) כמו ב"ל (030)? אסימטריה לא מתועדת | **שאלה לרוי/רו"ח** |
| 20 | `isReturningResident`/`isEilatResident` — שדות מתים (בסכימה, לא נשאלים, לא נקראים). להכריע: לממש או להסיר | **שאלת-מוצר פתוחה** |
| 21 | אימות-קלט ש-annualPaid של ב"ל לא כולל מס-בריאות (FLAG(Roy) קיים, לא נאכף) | בטוח לביצוע (רמז-UI) |

## שאלות שנשארו פתוחות (לא חוסמות את הסבב)
1. משימות 18-20 — צריכות את רוי (כללי-מס), לא הכרעת-קוד.
2. שיחות אנונימיות ב-/coach (persona=null): ברירת-המחדל שמומשה — בלי רשימת-צד כשלא מחוברים, היסטוריה זמנית בזיכרון. הפיך במילה של יוני.
3. הרשמה ב-SMS (מההודעה לחברים: "אין עדיין") — לא תוכנן בסבב הזה; דורש ספק SMS (Twilio/Vonage) והחלטת עלות.
4. אבטחה ברמת "עסק פיננסי" (מההודעה לחברים) — קיים מעקב ב-`docs/launch/regulatory-status.md` + CSP/rate-limit ב-STATUS; סבב ייעודי נפרד.
