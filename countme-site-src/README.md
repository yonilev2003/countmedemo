# CountMe Waitlist — מקור הדף (Claude Design)

נשלף מ-`CountMe Waitlist - Handoff.md` (26.10.2026), בלי עריכה.

| קובץ | מה זה |
|---|---|
| `CountMe Waitlist.dc.html` | קוד המקור. כל עריכה נעשית כאן, ואז בונים מחדש ב-Claude Design |
| `email/CountMe Confirmation Email.html` | תבנית מייל האישור, להדבקה ב-Brevo |

## איך זה מגיע לאתר
`python3 scripts/build-landing.py` בונה מהמקור הזה את `landing-site/index.html`, שמוגש ע"י פרויקט ה-Vercel `countme-landing-page`. פרטים ב-`landing-site/README.md`.

## צ'קליסט בדיקה (בלפטופ, על ה-preview של Vercel)
1. פותחים `/legal/terms-of-use.html` ו-`/legal/privacy-policy.html` ומוודאים שהם נפתחים (לא 404).
2. DevTools → Network, הרשמה אחת: האם הבקשה ל-`sibforms.com/serve/...?isAjax=1` חוזרת עם JSON `success`, או נכשלת ב-CORS ואז יוצאת בקשה שנייה (`no-cors`)?
3. ב-Brevo: איש הקשר הופיע ברשימה `waiting list`, עם EMAIL, SMS ו-OPT_IN.
4. מייל האישור הגיע (ובדיקה בתיקיית קידומים), עם תמונות, RTL וקישורים.

## ידוע ופתוח (מהמסמך)
- `fetch` ל-Brevo נופל ל-`mode: 'no-cors'` כשהבקשה הראשונה נכשלת ברמת הרשת. אז המשתמש רואה הצלחה גם אם ההרשמה לא נקלטה, ויכולה להישלח כפילות. מחליטים איך לתקן אחרי צעד 2 לעיל.
- ההודעה "שלחתי לך מייל אישור" נכונה רק כשאוטומציית ה-Welcome ב-Brevo פעילה.
- תיבת אישור אחת מאגדת הסכמה לשיווק עם תנאי שימוש ופרטיות (החלטה: כך בעיצוב). המסמכים המשפטיים הותאמו לזה. לבדוק משפטית.
- הכותרת "כמו רואה החשבון שלך" — לבדוק מול BNG או עורך דין.
- ה-PDF-ים הוחלפו בדפי HTML נגישים (`landing-site/legal/`), מתומללים מתמונות העמודים. לאמת מול המקור של תום.
- הדף החי שונה מהקובץ בפרויקט (כותרת ונוסח תיבת האישור). פרסום מחדש דורס אותם.
