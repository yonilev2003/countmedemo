# spec — countme MCP server (הכרעת "החלטת ה-MCP הפתוחה")

> נוצר: 2026-07-05 · סטטוס: **הוחלט — אופציה א' (לבנות MCP server משלנו), ניתן לפתיחה מחדש ע"י יוני** ·
> הקשר: ‏STATUS ‏03/07 השאיר פתוח: (א) MCP server של countme שחושף את המנוע ככלים — מומלץ, או
> (ב) חיבור קליינט לשירות נוסף. יוני הנחה (05/07) לפעול לפי התדריך ⇒ מאמצים את (א).
> (ב) לא נדחתה לצמיתות — היא פשוט לא מקדמת את המוצר עצמו כרגע.

## 1. למה (א)

- **Dogfooding מיידי:** סשני הפיתוח שלנו (Claude Code, וגם Sonnet/Opus בעבודה העצמאית של יוני) יקבלו
  גישה *דטרמיניסטית* למנוע במקום לחשב בעצמם — אוכף את "LLM לא מחשב" גם בפיתוח.
- **ערוץ הפצה עתידי:** אותו server, כשיהיה remote+auth, נחשף כ-connector לסוכני צד-שלישי (רו"ח עם
  agent משלו, Claude connectors) — המנוע הופך למוצר-API בלי לבנות API נפרד.
- **אפס לוגיקה חדשה:** הכלים עוטפים פונקציות קיימות בלבד. אין חישוב חדש = אין סיכון דיוק חדש.

## 2. מה חושפים (v0 — מקומי, stdio, ללא PII)

| כלי | עוטף | קלט | פלט |
|---|---|---|---|
| `calculate_field` | ‏dispatcher ב-`lib/calculators/index.ts` | ‏persona-json (או persona דמו), ‏fieldId, ‏taxYear | ‏CalcResult מלא (value, formula, sources, confidence) |
| `estimate_tax_liability` | `estimateTaxLiability` | persona-json, ‏taxYear | חבות משוערת + פירוק מדרגות |
| `get_tax_constants` | `getTaxYearConstants` | ‏taxYear | הקבועים + provenance (סימוני FROZEN/CARRIED/FLAG) |
| `get_deductions_table` | `getDeductionsTable` | ‏taxYear | ניכויים/זיכויים + ‏formFields + ‏plImpact + הסקיל האחראי |
| `check_ceiling` | `lib/alerts/ceiling.ts` | מחזור, ‏osekType, ‏taxYear | סטטוס תקרת פטור/זעיר |

**עקרונות מחייבים:** קבועים אך ורק מ-`types.ts` (הכלי מסרב לשנת-מס לא מוגדרת — לא ממציא) · read-only,
אפס side effects · אין PII אמיתי ב-v0 — פרסונת דמו או persona שהמשתמש מספק ידנית · כל פלט כולל את שדה
ה-confidence ואת ה-gaps של המחשבון.

## 3. מבנה

```
mcp/
├── server.ts        # @modelcontextprotocol/sdk, stdio transport
├── tools.ts         # הגדרות הכלים — עטיפות דקות בלבד מעל src/lib
└── README.md        # איך מחברים (claude_desktop_config / .mcp.json של הריפו)
```

חיבור לסשני-פיתוח דרך `.mcp.json` בריפו (נטען אוטומטית ב-Claude Code). ‏SDK: `@modelcontextprotocol/sdk`
— תוספת devDependency; לפי מוסכמה 7 זה מתועד כאן וב-CLAUDE.md לפני ההתקנה.

## 4. שלבים

- **v0 (סשן אחד):** ‏stdio מקומי, ‏5 הכלים, ‏smoke test ‏vitest שמאמת שכל כלי מחזיר בדיוק את מה שהפונקציה
  העטופה מחזירה (אנטי-drift). ‏DoD: סשן Claude עונה "מה שדה 030 של דנה ב-2025" דרך הכלי בלבד.
- **v1 (אחרי גייטינג חי):** ‏transport מרוחק (HTTP) מאחורי auth של Supabase, ‏persona של המשתמש המחובר,
  rate limiting מהשכבה הקיימת. **לא לפני** ‏PII minimization ו-gating מודלקים.
- **v2 (עסקי):** חשיפה כ-connector חיצוני לרו"ח/סוכנים — מחייב החלטת יוני נפרדת (ראה דילמה 3
  ב-`docs/consultation-prep.md`).

## 5. סיכונים ידועים

- חשיפת IP של המנוע ב-v2 (לא ב-v0/v1) — לדון לפני v2.
- מודל שמצטט פלט כלי ומעוות אותו — מטופל ע"י החזרת formula+value כטקסט סגור להעתקה, כמו ב-chat.
- כפילות מול ה-tool-use הקיים ב-`/api/chat` — בכוונה: אותן פונקציות, שני transports; אסור לפצל לוגיקה.
