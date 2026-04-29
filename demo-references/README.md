# Demo References

תיקיה זו מכילה את התמונות הוויזואליות שעליהן מבוסס הדמו של countme. 16 תמונות של טופס 1301 כפי שהוא מופיע בפועל באתר רשות המסים `secapp.taxes.gov.il`, שנת מס 2024.

## איך להעלות תמונות

לאחר אתמול בלילה כל ה-16 תמונות עדיין במסך של יוני, לא בריפו. כדי להעלות:

**אופציה 1 — דרך GitHub web UI (הכי פשוט מהטלפון):**
1. כנס/י לריפו `countmedemo` ב-GitHub
2. נווט/י ל-`demo-references/`
3. גרור/י את התמונות (5 בכל פעם, מגבלת GitHub) או "choose your files"
4. בחר/י "Commit directly to the main branch" אם הסיכום בסדר, או "Create a new branch" כדי לפתוח PR
5. אם פותחים PR, אצטרך גישה ל-`main` או PR לעבר הברנץ' שלי כדי לראות

**אופציה 2 — מקומית (אם יש לך את התמונות במחשב):**
```
cp ~/Downloads/screenshot1.png demo-references/01-landing.png
cp ~/Downloads/screenshot2.png demo-references/02-action-select.png
# ...
git add demo-references/
git commit -m "תמונות הפניה לדמו"
git push
```

## ההצעה לקונבנציה של שמות

```
01-landing.png                    # gov.il/he/service - דף הנחיתה
02-action-select.png              # מסך בחירת פעולה (הזנת דו"ח שנתי מלא)
03-personal-tab.png               # לשונית "פרטים אישיים"
04-personal-business.png          # אותה לשונית, פרטי עסק וחשבון בנק
05-general-tab.png                # לשונית "פרטים כלליים"
06-general-bottom.png             # סוף לשונית פרטים כלליים
07-income-tab-top.png             # לשונית "פירוט הכנסות" - חלק עליון
08-income-tab-mid.png             # אמצע
09-income-tab-deductions.png      # סעיף יב' ניכויים
10-income-tab-credits.png         # סעיף יג' נקודות זיכוי
11-income-tab-credits-end.png     # סוף סעיף יג'
12-income-tab-turnover.png        # סעיף טו' מחזור למקדמות
13-income-tab-bottom.png          # סוף לשונית הכנסות
14-misc-trust.png                 # נאמנות, שותפויות, מטבע וירטואלי
15-misc-bottom.png                # סעיפים אחרונים
16-confirmation.png               # מסך אישור / שידור
```

## הערה על פרטיות

התמונות שיוני שלח אתמול בלילה מכילות **נתונים אישיים אמיתיים** של תום לב שורץ (לפי הצילומים: ת"ז 207190158, מייל tomlevs15@..., טלפון 7707, כתובת בהרצליה, מאפרת בעסק "תום לב מייקאפ"). **חשוב מאוד**:

1. לוודא שיש לתום לב הסכמה מפורשת לחשיפה הזו לפני שמעלים לריפו ציבורי
2. אם הריפו פרטי עכשיו, וידוא שלא הופך לציבורי לפני שמטשטשים פרטים
3. בקוד ובפרסומים — להשתמש *רק* ב-`personas/dana-cohen.json` (הדמות הבדיונית)

אם אין הסכמה ברורה, מומלץ לטשטש פרטים לפני העלאה (למשל ב-Photoshop או GIMP, או אפילו פשוט מסכת ריבועים בתוכנת תצלומים בטלפון).
