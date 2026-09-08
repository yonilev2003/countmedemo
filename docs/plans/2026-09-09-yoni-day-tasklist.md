---
title: "רשימת משימות ל-09/09/2026 — סבב עם יוני (Supabase MCP + פטנט-שטחי)"
date: 2026-09-08
type: plan
status: ready
related: "docs/specs/2026-09-08-review-mechanism-and-backlog.md · docs/specs/patent-prior-art-scan-2026-09-08.md · memory/decisions.md (08/09)"
---

> נכתב 08/09/2026 בסוף הסבב שבנה את מנגנון-הסקירה. **שני הפרקים למטה דורשים
> את יוני בפועל** (לא ניתן לבצע חד-צדדית מסשן-AI) — זו הסיבה שהם "למחר" ולא
> היום. שום דבר כאן לא בוצע עדיין.

## חלק א' — Supabase MCP: חיבור-חד-פעמי + כל הפעולות שדורשות אותו

**רקע:** מ-03/08 ועד היום (08/09), כל ניסיון לחבר את Supabase MCP מסשן-AI
ראה חשבון **לא-נכון** (`megamodel2000@gmail.com` / `akfg`, לא `hbsgzelipeawkvtcazdr`
של יוני) — תועד ב-`memory/decisions.md` לפחות 3 פעמים נפרדות. **המשימה
הראשונה של מחר, לפני הכל,** היא לוודא שהחיבור בפעם הזו רואה את הפרויקט
הנכון — אחרת שאר הרשימה חוסמת.

### א.1 — חיבור וּוידוא (יוני)
- [ ] לחבר-מחדש את ה-Supabase connector בהגדרות-החשבון (לא רק env keys —
      בעיות קודמות היו ברמת ה-connector עצמו).
- [ ] אימות מיידי: `list_projects`/`get_project` מחזיר `hbsgzelipeawkvtcazdr`.
      אם לא — לעצור כאן ולתעד מה כן מוצג, לא להמשיך "כאילו".

### א.2 — מיגרציות ממתינות (3, כל אחת ידנית/MCP)
- [ ] `supabase/migrations/20260908120000_review_decisions.sql` — **החדשה
      מהיום.** בלעדיה `/admin/review` עובד אך כל כרטיס מוצג "לא נסקר"
      לצמיתות (אין מקום לשמור החלטה).
- [ ] `supabase/migrations/20260818100000_knowledge_chunks.sql` — **ישנה,
      עדיין לא הוחלה.** בלעדיה ה-RAG הטקסטואלי (search_knowledge/
      read_knowledge) לא חי בפרודקשן בכלל — שקל/הצ'אט חוזרים ל"לא זמין".
- [ ] `supabase/migrations/20260818110000_search_knowledge_natural_language.sql`
      — תלויה ב-knowledge_chunks, להחיל מיד אחריה.
- [ ] אחרי שתי מיגרציות ה-knowledge: להריץ `node scripts/index-knowledge.mjs`
      **מול הפרויקט האמיתי** (עם `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_
      SUPABASE_URL` אמיתיים — לא הדמה שבה עבדתי מקומית) כדי שהכספת (66
      פתקים) תיטען בפועל ל-`knowledge_chunks`.

### א.3 — בדיקות-קונסולה שחוזרות (עכשיו בפעם הרביעית/חמישית)
- [ ] `rate_limit_buckets` + `check_rate_limit()` קיימים ב-SQL Editor —
      הקוד **נכשל-פתוח** אם המיגרציה לא חלה (מותר-הכל, לא חסום-הכל).
- [ ] WAF פעיל (Active, לא רק Review) + Save בדשבורד Vercel.
- [ ] Redirect URL ב-Supabase Auth כולל `countmedemo-eight.vercel.app/auth/callback`
      (ותיקון Site URL אם הוא עדיין מצביע על `countmedemo.vercel.app` השגוי).

### א.4 — env + אימות-קצה (עם MCP או ישירות ב-Vercel)
- [ ] `ADMIN_EMAILS` כולל את המייל של יוני, גם ב-Production וגם ב-Preview
      (בדיוק אותו באג שקרה ל-`AUTH_GATING_ENABLED` — דגל שמוגדר בסביבה אחת
      ולא בשנייה). בלי זה `/admin` ו-`/admin/review` מחזירים 404 ליוני עצמו.
- [ ] אחרי הפריסה הבאה: לפתוח `/admin/review` בפרודקשן, לוודא שכרטיסים
      נטענים (לא "לא ניתן לטעון"), ולבצע **החלטת-בדיקה אחת אמיתית** (אישור
      על פריט כלשהו) כדי לוודא שהכתיבה ל-`review_decisions` עובדת קצה-לקצה.
- [ ] אופציונלי, לא-חוסם: `generate_typescript_types` מחדש כדי ש-
      `review_decisions`/`knowledge_chunks`/`ai_usage` יהפכו טיפוסיים
      (מבטל את ה-`untypedAdminClient()` workarounds שקיימים ב-3 מקומות
      בקוד היום — ניקיון, לא דחוף).

### א.5 — סדר מומלץ
א.1 (חיבור) → א.2 (מיגרציות, בסדר הזה) → א.3 (בדיקות שקיימות מזמן, קצר) →
א.4 (env + בדיקת-קצה). כל שלב חוסם את הבא — אל תדלג.

## חלק ב' — פטנט: Workflow שטחי/בסיסי (dynamic workflows)

**לא עוד מחקר-פריור-ארט** — זה כבר בוצע (`docs/specs/patent-prior-art-scan-2026-09-08.md`,
5 רכיבים, מקורות מלאים). מה שביקשת: agent ב-dynamic workflows, רמה בסיסית
ושטחית — תקציר-שיחה-ראשונה + gut-check פשוט, לא ניתוח משפטי.

**מוכן להרצה:** `.claude/workflows/patent-basic-gutcheck.js` — נכתב היום,
2 סוכנים (Draft → GutCheck), משתמש רק במסמכים שכבר קיימים בריפו. להריץ מחר
עם:

```
Workflow({ name: "patent-basic-gutcheck" })
```

תוצאה צפויה: תקציר-לא-טכני בן פחות מ-400 מילה לשיחה ראשונה עם עורך-פטנטים,
ועוד קצר-יותר, gut-check ישר (worth a consult / not yet / unclear) בלי
להתחזות לחוות-דעת משפטית.

## מה NOT-לעשות מחר (מפורש, כדי לא לבזבז זמן)

- לא לפתוח PR/למזג את הענף — זו עדיין החלטה נפרדת של יוני, לא קשורה לרשימה
  הזו.
- לא לבנות אימות-סוקר-חיצוני (backlog item #7 ב-`docs/specs/2026-09-08-*`)
  — לא היום, לא מחר, רק כשיש רו"ח אמיתי שמצטרף.
- לא לתקן את הכפילויות-שנמצאו-ולא-תוקנו (סף-מספר-הקצאה, תאריכי-מע"מ) בלי
  ישיבה נפרדת — הן דורשות אימות-רגולטורי, לא ניחוש תחת לחץ-זמן.
