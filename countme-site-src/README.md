# CountMe Waitlist — מקור הדף (Claude Design)

נשלף מ-`CountMe Waitlist - Handoff.md` (26.10.2026), בלי עריכה.

| קובץ | מה זה |
|---|---|
| `CountMe Waitlist.dc.html` | קוד המקור. כל עריכה נעשית כאן, ואז בונים מחדש ב-Claude Design |
| `email/CountMe Confirmation Email.html` | תבנית מייל האישור, להדבקה ב-Brevo |

## איך זה מגיע לאתר
`python3 scripts/build-landing.py` בונה מהמקור הזה את `landing-site/index.html`, שמוגש ע"י פרויקט ה-Vercel `countme-landing-page`. פרטים ב-`landing-site/README.md`.

## ~~הגדרת Brevo~~ (בוטל: Brevo חסם את החשבון. המייל נשלח עכשיו דרך Resend, ראו `landing-site/README.md`)
התמונות והתבנית עדיין תקפות. השלבים למטה נשמרו לעיון בלבד.
התמונות והתבנית מוכנות. התמונות מוגשות מהאתר עצמו (`landing-site/email/`, בכתובת `https://www.countme.co.il/email/...`), אז **אין צורך להעלות אותן ל-Brevo**.
1. **תבנית:** Brevo, Campaigns/Templates, תבנית חדשה, "Paste your code", להדביק את `email/CountMe Confirmation Email.html` כמו שהוא (כולל `{{ unsubscribe }}`).
2. **שולח ונושא:** נושא מוצע: "שמרנו לך מקום ב-CountMe". המייל כותב "פשוט עונים למייל הזה", לכן כתובת השולח או ה-Reply-To חייבת להיות תיבה שמישהו קורא.
3. **אוטומציה:** Automations, טריגר "Contact added to list" = `waiting list`, פעולה "Send an email" עם התבנית.
4. **אימות הדומיין (בשביל שהמייל לא ייפול לספאם):** Senders, Domains & IPs, Domains, להוסיף `countme.co.il`. Brevo מציג רשומות (TXT לאימות, DKIM, DMARC). להוסיף אותן ב-**LiveDNS** באותו מקום שבו נוספו רשומות ה-A וה-CNAME של האתר. **לא צריך להעביר שרתי שמות**: Vercel מזהה את הרשומות הקיימות ב-LiveDNS (`www` CNAME ל-Vercel, apex A) כתקינות.
5. **הודעת ההצלחה בדף** ("שלחתי לך מייל אישור") נכונה רק אחרי שלבים 1 עד 3.

## צ'קליסט בדיקה (בלפטופ)
1. נרשמים בדף החי עם yonilev2003@gmail.com ועם הטלפון.
2. DevTools, Network: האם הבקשה ל-`sibforms.com/serve/...?isAjax=1` חוזרת עם JSON `success`, או נכשלת ב-CORS ואז יוצאת בקשה שנייה (`no-cors`)?
3. ב-Brevo: איש הקשר הופיע ברשימה `waiting list`, עם EMAIL, SMS ו-OPT_IN.
4. מייל האישור הגיע (ובדיקה בתיקיית קידומים וספאם), עם תמונות, RTL וקישורים.
5. `/legal/terms-of-use.html` ו-`/legal/privacy-policy.html` נפתחים.

## ידוע ופתוח (מהמסמך)
- `fetch` ל-Brevo נופל ל-`mode: 'no-cors'` כשהבקשה הראשונה נכשלת ברמת הרשת. אז המשתמש רואה הצלחה גם אם ההרשמה לא נקלטה, ויכולה להישלח כפילות. מחליטים איך לתקן אחרי צעד 2 לעיל.
- ההודעה "שלחתי לך מייל אישור" נכונה רק כשאוטומציית ה-Welcome ב-Brevo פעילה.
- תיבת אישור אחת מאגדת הסכמה לשיווק עם תנאי שימוש ופרטיות (החלטה: כך בעיצוב). המסמכים המשפטיים הותאמו לזה. לבדוק משפטית.
- הכותרת "כמו רואה החשבון שלך" — לבדוק מול BNG או עורך דין.
- ה-PDF-ים הוחלפו בדפי HTML נגישים (`landing-site/legal/`), מתומללים מתמונות העמודים. לאמת מול המקור של תום.
- הדף החי שונה מהקובץ בפרויקט (כותרת ונוסח תיבת האישור). פרסום מחדש דורס אותם.
