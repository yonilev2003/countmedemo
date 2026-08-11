/* ============================================================
   CountMe — מסע כניסה (גרסה 5)
   מקור: ארטיפקט claude.ai/public/artifacts/e5f17059-df15-4205-8d68-ea8497e76038
   הודבק ע"י יוני 2026-08-11 כקוד גולמי, ללא עריכה. שמור כמקור-רפרנס.

   שים לב — לא הועתק כלשונו למוצר (ראו החלטות ב-onboarding.md):
   פלטת צבעים שונה מה-Brand Kit הנעול, מסכי סיסמה+SMS OTP שכופלים
   את ה-auth הקיים (Google OAuth), ואפשרות "חברה בע״מ" שמנוגדת
   להחלטה הנעולה "עוסקים יחידים בלבד". התבניות (בורר-עיסוק
   חיפוש-תחילה, מילוי-אוטומטי מת.ז, תצוגת-מסמך חיה) כן אומצו.
   ============================================================ */

import React, { useState, useMemo, useRef, useEffect } from "react";

const C = {
  bg: "#FAF8F3", surface: "#FFFFFF", paper: "#FCFBF7",
  ink: "#1B1A2E", inkSoft: "#6C6A82",
  primary: "#5B4BE8", primaryDeep: "#3A2CB8",
  mint: "#17C29B", line: "#ECE8DF", danger: "#E5484D", amber: "#E8912D",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Rubik:wght@500;600;700;900&display=swap');
.cm *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.cm{font-family:'Assistant',system-ui,sans-serif}
.cm-d{font-family:'Rubik','Assistant',sans-serif}
@keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes fill{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
@keyframes sheet{from{transform:translateY(100%)}to{transform:none}}
.stepIn{animation:in .32s cubic-bezier(.2,.8,.2,1) both}
.fieldFill{animation:fill .28s ease both}
.sheetIn{animation:sheet .28s cubic-bezier(.2,.8,.2,1) both}
.cm input,.cm select{font-family:inherit;font-size:16px;width:100%;padding:13px 14px;border-radius:13px;
  border:1.5px solid ${C.line};background:${C.surface};color:${C.ink};outline:none;
  transition:border-color .18s,box-shadow .18s}
.cm input:focus{border-color:${C.primary};box-shadow:0 0 0 4px ${C.primary}1F}
.cm input.err{border-color:${C.danger};box-shadow:0 0 0 4px ${C.danger}18}
.cm input:disabled{background:#F6F5F1;color:${C.inkSoft}}
.chip{transition:transform .14s,border-color .18s,background .18s}
.chip:active{transform:scale(.98)}
.chip:focus-visible,.btn:focus-visible{outline:3px solid ${C.primary}55;outline-offset:2px}
.btn{transition:transform .14s,box-shadow .2s,opacity .2s}
.btn:active{transform:translateY(1px)}
.taxrow:hover{background:${C.primary}0A}
@media (prefers-reduced-motion:reduce){.stepIn,.fieldFill,.sheetIn{animation:none!important}}
`;

/* ---------- ולידציה ---------- */
function validId(v) {
  const s = String(v || "").trim();
  if (!/^\d{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(s[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}
const validPhone = (v) => /^05\d{8}$/.test(String(v || "").replace(/[\s-]/g, ""));
const pwRules = (p) => ({
  len: p.length >= 8 && p.length <= 16,
  mix: /\d/.test(p) && /[A-Za-z֐-׿]/.test(p),
  case: /[a-z]/.test(p) && /[A-Z]/.test(p),
});

/* ---------- טקסונומיית עיסוקים (מבנה כמו morning) ---------- */
const TAX = {
  "אבטחה וחקירות": ["שירותי אבטחה", "שירותי חקירה", "אחר"],
  "אדמיניסטרציה ולוגיסטיקה": ["השמה, גיוס ומשאבי אנוש", "ועד בית", "שירותי משרד", "שליחויות", "אחר"],
  "אדריכלות ועיצוב": ["אדריכלות", "עיצוב פנים", "עיצוב תכשיטים", "עיצוב תעשייתי", "אחר"],
  "אופנה ויופי": ["איפור", "מניקור / פדיקור", "עיצוב אופנה", "עיצוב שיער", "קוסמטיקאית", "שירותי סטיילינג", "אחר"],
  "אינטרנט ומחשבים": ["פיתוח תוכנה", "שיווק דיגיטלי", "עיצוב חווית משתמש", "ייעוץ טכנולוגי", "בדיקות תוכנה", "טכנאי מחשבים", "IT", "BI", "אחר"],
  "אירוח והסעדה": ["הפקת אירועים", "צימרים וחדרי אירוח", "קונדיטוריה", "קייטרינג", "אחר"],
  "אמנות ויצירה": ["איור", "ציור", "הפעלת ימי הולדת", "הוצאה לאור", "תיאטרון", "אחר"],
  "בניין, שיפוצים ותחזוקה": ["שיפוצים", "חשמל", "אינסטלציה", "נגרות", "מסגרות", "מיזוג אוויר", "קבלנות", "אחר"],
  "בעלי חיים": ["אילוף כלבים", "דוג ווקר", "פנסיון כלבים", "רפואה וטרינרית", "אחר"],
  "בריאות ונפש": ["פסיכולוגיה", "פיזיותרפיה", "עיסוי", "ייעוץ תזונתי", "ריפוי בעיסוק", "קלינאות תקשורת", "טיפול אלטרנטיבי", "עבודה סוציאלית", "אחר"],
  "הנדסה": ["הנדסת חשמל", "הנדסת בניין", "הנדסת מכונות", "ייעוץ ותכנון", "מודד מוסמך", "אחר"],
  "חוגים, פנאי וספורט": ["אימון כושר", "פילאטיס ויוגה", "חוגים", "קבוצת ספורט", "אחר"],
  "חינוך והוראה": ["מורה פרטי", "מרצה", "גן ילדים", "הוראה מתקנת", "אחר"],
  "חשבונאות": ["ראיית חשבון", "ייעוץ מס", "הנהלת חשבונות", "אחר"],
  "טלוויזיה ומקצועות הבמה": ["צילום", "הפקות", "מוסיקה", "סאונד", "משחק", "די ג׳יי", "תסריטאות", "אחר"],
  "ייעוץ וקואוצ׳ינג": ["אימון אישי", "ייעוץ עסקי", "אחר"],
  "משפטים": ["עו״ד", "עו״ד ונוטריון", "גישור", "אחר"],
  "משק בית": ["שירותי ניקיון", "בישול", "אחר"],
  "נדל״ן": ["תיווך", "שמאות", "ייעוץ מקרקעין", "אחר"],
  "פיננסים, השקעות וביטוח": ["סוכן ביטוח", "בנקאות", "אחר"],
  "פרסום ושיווק": ["עיצוב גרפי", "ייעוץ שיווקי", "כתיבה שיווקית", "צילום", "שיווק ומכירות", "הפקת דפוס", "אחר"],
  "שילוח": ["שילוח", "עמילות מכס", "מסחר בינלאומי", "אחר"],
  "שירותי דת": ["רב", "מוהל", "משגיח כשרות", "אחר"],
  "תיירות ונופש": ["סוכנות נסיעות", "הדרכת טיולים", "ארגון טיולים", "אחר"],
  "תקשורת ועיתונות": ["יחסי ציבור", "עריכה ותרגום", "כתיבה עיתונאית", "דוברות", "שירותי תוכן", "אחר"],
};
const FLAT = Object.entries(TAX).flatMap(([g, items]) =>
  items.map((i) => ({ g, i, full: `${g}, ${i}` })));
const POPULAR = [
  "אינטרנט ומחשבים, פיתוח תוכנה",
  "פרסום ושיווק, עיצוב גרפי",
  "ייעוץ וקואוצ׳ינג, ייעוץ עסקי",
  "בריאות ונפש, פסיכולוגיה",
  "חינוך והוראה, מורה פרטי",
  "בניין, שיפוצים ותחזוקה, שיפוצים",
];

const TENURE = ["טרם התחלתי", "שנה ראשונה", "1–3 שנים", "3–5 שנים", "מעל 5 שנים"];
const BIZTYPE = ["עוסק פטור", "עוסק מורשה", "חברה בע״מ", "עדיין לא פתחתי"];
const PRIOR = [
  "עדיין לא הפקתי מסמכים בעסק",
  "פנקס חשבוניות ידני",
  "מערכת דיגיטלית אחרת",
  "רואה חשבון מפיק עבורי",
];

const BLANK = {
  first: "", last: "", taxId: "", phone: "", pw: "", pw2: "",
  terms: false, marketing: true, code: "",
  tenure: "", bizType: "", prior: "", occupation: "",
  ecommerce: false, micro: false,
  vatId: "", bizName: "", bizNameEn: "", city: "", address: "", startNumber: "",
};
const SAMPLE = {
  first: "רועי", last: "לוי", taxId: "000000018", phone: "0501234567",
  pw: "Abcd1234", pw2: "Abcd1234", terms: true, marketing: true, code: "483920",
  tenure: "שנה ראשונה", bizType: "עוסק פטור",
  prior: "מערכת דיגיטלית אחרת",
  occupation: "פרסום ושיווק, עיצוב גרפי",
  ecommerce: false, micro: true,
  vatId: "000000018", bizName: "סטודיו לוי", bizNameEn: "Levi Studio",
  city: "תל אביב", address: "הרצל 10", startNumber: "1001",
};

const DEMO_STEPS = ["פרטים", "אימות", "היכרות", "העסק", "סיום"];

function DemoBar({ step, setStep, filled, onFill, onClear }) {
  return (
    <div style={{
      background: C.ink, borderRadius: 16, padding: "11px 12px", marginBottom: 16,
      boxShadow: "0 8px 22px rgba(27,26,46,.18)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 9, paddingInline: 2,
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#9B97B8", letterSpacing: ".4px" }}>
          מצב הדגמה · מעבר חופשי בין מסכים
        </span>
        <button onClick={filled ? onClear : onFill} style={{
          background: filled ? "transparent" : C.mint, border: filled ? `1px solid #4A4766` : "none",
          color: filled ? "#C9C6DE" : "#08302A", fontWeight: 800, fontSize: 10.5,
          padding: "4px 10px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit",
        }}>{filled ? "נקה" : "מלא לדוגמה"}</button>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {DEMO_STEPS.map((l, i) => {
          const on = step === i;
          return (
            <button key={l} onClick={() => setStep(i)} style={{
              flex: 1, padding: "8px 2px", borderRadius: 9, cursor: "pointer",
              border: "none", fontFamily: "inherit",
              background: on ? C.primary : "#2C2A45",
              color: on ? "#fff" : "#A5A1C0",
              fontWeight: on ? 800 : 600, fontSize: 11.5,
              transition: "background .18s",
            }}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function CountMeJourney() {
  const [step, setStep] = useState(0);
  const [t, setT] = useState({});
  const [d, setD] = useState(BLANK);
  const top = useRef(null);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const mark = (k) => setT((p) => ({ ...p, [k]: true }));

  const STEPS = ["פרטים אישיים", "אימות", "היכרות", "פרטי העסק"];
  const needsNumbering = d.prior === "פנקס חשבוניות ידני" || d.prior === "מערכת דיגיטלית אחרת";

  useEffect(() => {
    if (step === 3 && !d.vatId && validId(d.taxId) && d.bizType !== "חברה בע״מ") {
      set("vatId", d.taxId);
    }
  }, [step]); // eslint-disable-line

  const errors = useMemo(() => {
    const e = {};
    const r = pwRules(d.pw);
    if (step === 0) {
      if (!d.first.trim()) e.first = "שדה חובה";
      if (!d.last.trim()) e.last = "שדה חובה";
      if (!d.taxId.trim()) e.taxId = "שדה חובה";
      else if (!validId(d.taxId)) e.taxId = "מספר תעודת הזהות אינו תקין";
      if (!d.phone.trim()) e.phone = "שדה חובה";
      else if (!validPhone(d.phone)) e.phone = "מספר נייד לא תקין — 05 ועוד 8 ספרות";
      if (!d.pw) e.pw = "שדה חובה";
      else if (!(r.len && r.mix && r.case)) e.pw = "הסיסמה לא עומדת בתנאים";
      if (!d.pw2) e.pw2 = "שדה חובה";
      else if (d.pw !== d.pw2) e.pw2 = "רגע, רגע — הסיסמה הזו לא זהה לסיסמה שבחרת";
      if (!d.terms) e.terms = "יש לאשר את תנאי השימוש";
    }
    if (step === 1 && d.code.replace(/\D/g, "").length !== 6) e.code = "יש להזין 6 ספרות";
    if (step === 2) {
      if (!d.tenure) e.tenure = "בחר אפשרות";
      if (!d.bizType) e.bizType = "בחר אפשרות";
      if (!d.prior) e.prior = "בחר אפשרות";
      if (!d.occupation) e.occupation = "בחר תחום עיסוק";
    }
    if (step === 3) {
      if (!d.vatId.trim()) e.vatId = "שדה חובה";
      else if (!validId(d.vatId)) e.vatId = "מספר העוסק אינו תקין";
      if (!d.bizName.trim()) e.bizName = "שדה חובה";
      if (!d.city.trim()) e.city = "שדה חובה";
      if (!d.address.trim()) e.address = "שדה חובה";
      if (needsNumbering && d.startNumber && !/^\d{1,9}$/.test(d.startNumber))
        e.startNumber = "ספרות בלבד";
    }
    return e;
  }, [step, d, needsNumbering]);

  const ok = Object.keys(errors).length === 0;
  const done = step === 4;

  function next() {
    if (!ok) {
      setT((p) => { const n = { ...p }; Object.keys(errors).forEach((k) => (n[k] = true)); return n; });
      return;
    }
    setStep((s) => s + 1);
    setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <div className="cm" dir="rtl" style={{
      minHeight: "100%", background: `radial-gradient(120% 70% at 50% -10%, ${C.primary}10, ${C.bg} 55%)`,
      display: "flex", justifyContent: "center", padding: "16px 14px 40px", color: C.ink,
    }}>
      <style>{CSS}</style>
      <div style={{ width: "100%", maxWidth: 440 }} ref={top}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div className="cm-d" style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg,${C.primary},${C.primaryDeep})`, color: "#fff",
            display: "grid", placeItems: "center", fontWeight: 900, fontSize: 17,
            boxShadow: `0 6px 16px ${C.primary}50`,
          }}>₪</div>
          <span className="cm-d" style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-.3px" }}>CountMe</span>
        </div>

        <DemoBar
          step={step} setStep={(i) => { setStep(i); setT({}); }}
          filled={!!d.first}
          onFill={() => setD(SAMPLE)}
          onClear={() => { setD(BLANK); setT({}); }}
        />

        {!done && <Stepper step={step} labels={STEPS} />}

        <div key={step} className="stepIn">
          {step === 0 && <Personal d={d} set={set} mark={mark} t={t} e={errors} />}
          {step === 1 && <Verify d={d} set={set} mark={mark} t={t} e={errors} />}
          {step === 2 && <Intro d={d} set={set} mark={mark} t={t} e={errors} />}
          {step === 3 && <BizDetails d={d} set={set} mark={mark} t={t} e={errors} needsNumbering={needsNumbering} />}
          {done && <Done d={d} onReset={() => { setStep(0); setT({}); setD(BLANK); }} />}
        </div>

        {!done && (
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && step !== 1 && (
              <button className="btn" onClick={() => setStep((s) => s - 1)} style={{
                padding: "15px 20px", borderRadius: 14, border: `1.5px solid ${C.line}`,
                background: C.surface, color: C.inkSoft, fontWeight: 700, fontSize: 15.5, cursor: "pointer",
              }}>הקודם</button>
            )}
            <button className="btn" onClick={next} style={{
              flex: 1, padding: "15px", borderRadius: 14, border: "none", cursor: "pointer",
              background: ok ? `linear-gradient(135deg,${C.primary},${C.primaryDeep})` : C.line,
              color: ok ? "#fff" : C.inkSoft, fontWeight: 800, fontSize: 16.5,
              fontFamily: "'Rubik',sans-serif", boxShadow: ok ? `0 10px 24px ${C.primary}40` : "none",
            }}>{step === 3 ? "סיום" : "המשך"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Personal({ d, set, mark, t, e }) {
  const r = pwRules(d.pw);
  const match = d.pw2 && d.pw === d.pw2;
  return (
    <div>
      <h2 className="cm-d" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.5px", lineHeight: 1.25, margin: 0 }}>
        כיף שבחרת להצטרף אלינו
      </h2>
      <p style={{ margin: "8px 0 20px", fontSize: 14.5, color: C.inkSoft, lineHeight: 1.5 }}>
        לפני שנתחיל — הפרטים האישיים שלך ובחירת סיסמה.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <F label="שם פרטי" hint="השם שלך, לא שם העסק" err={t.first && e.first}>
          <input value={d.first} onChange={(v) => set("first", v.target.value)}
            onBlur={() => mark("first")} className={t.first && e.first ? "err" : ""} placeholder="רועי" />
        </F>
        <F label="שם משפחה" err={t.last && e.last}>
          <input value={d.last} onChange={(v) => set("last", v.target.value)}
            onBlur={() => mark("last")} className={t.last && e.last ? "err" : ""} placeholder="לוי" />
        </F>
      </div>

      <div style={{ marginTop: 14 }}>
        <F label="תעודת זהות" hint="משמש לזיהוי בלבד ולא יוצג במסמכים" err={t.taxId && e.taxId}>
          <input value={d.taxId} inputMode="numeric" maxLength={9}
            onChange={(v) => set("taxId", v.target.value.replace(/\D/g, ""))}
            onBlur={() => mark("taxId")} className={t.taxId && e.taxId ? "err" : ""}
            placeholder="000000000" style={{ letterSpacing: "2px", fontVariantNumeric: "tabular-nums" }} />
        </F>
        {validId(d.taxId) && <Good>המספר תקין</Good>}
      </div>

      <div style={{ marginTop: 14 }}>
        <F label="מספר טלפון נייד" hint="משמש לאבטחה ואימות החשבון בלבד" err={t.phone && e.phone}>
          <input value={d.phone} inputMode="tel"
            onChange={(v) => set("phone", v.target.value)} onBlur={() => mark("phone")}
            className={t.phone && e.phone ? "err" : ""} placeholder="050-0000000" />
        </F>
      </div>

      <div style={{ marginTop: 14 }}>
        <F label="יצירת סיסמה" err={t.pw && e.pw}>
          <input type="password" value={d.pw} onChange={(v) => set("pw", v.target.value)}
            onBlur={() => mark("pw")} className={t.pw && e.pw ? "err" : ""} placeholder="סיסמה חדשה" />
        </F>
      </div>

      {d.pw && (
        <div className="fieldFill" style={{
          marginTop: 10, background: C.paper, border: `1px solid ${C.line}`,
          borderRadius: 12, padding: "11px 13px",
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 7 }}>על הסיסמה להכיל</div>
          <Rule ok={r.len}>בין 8 ל-16 תווים</Rule>
          <Rule ok={r.mix}>שילוב של ספרות ואותיות</Rule>
          <Rule ok={r.case}>לפחות אות גדולה אחת ואות קטנה אחת</Rule>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <F label="חזרה על הסיסמה" err={t.pw2 && e.pw2}>
          <input type="password" value={d.pw2} onChange={(v) => set("pw2", v.target.value)}
            onBlur={() => mark("pw2")} className={t.pw2 && e.pw2 ? "err" : ""}
            placeholder="הקלדה חוזרת של הסיסמה" />
        </F>
        {match && <Good>זהה לסיסמה שבחרת</Good>}
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={d.terms} onChange={(v) => { set("terms", v.target.checked); mark("terms"); }}
          style={{ width: 17, height: 17, accentColor: C.primary, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.45 }}>
          קראתי ואישרתי את תנאי השימוש ומדיניות הפרטיות
        </span>
      </label>
      {t.terms && e.terms && <Err>{e.terms}</Err>}

      <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 11, cursor: "pointer" }}>
        <input type="checkbox" checked={d.marketing} onChange={(v) => set("marketing", v.target.checked)}
          style={{ width: 17, height: 17, accentColor: C.primary, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, lineHeight: 1.45 }}>
          עדכונים על המערכת והטבות. אפשר לבטל בכל רגע.
        </span>
      </label>
    </div>
  );
}

function Verify({ d, set, mark, t, e }) {
  const [sec, setSec] = useState(30);
  useEffect(() => {
    if (sec <= 0) return;
    const id = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sec]);

  const digits = d.code.replace(/\D/g, "").padEnd(6, " ").split("").slice(0, 6);
  const pretty = d.phone.replace(/\D/g, "").replace(/^0/, "+972-").replace(/^(\+972-)(\d{2})(\d+)/, "$1$2-$3");

  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px 0 22px" }}>
        <div style={{
          width: 58, height: 58, borderRadius: 18, margin: "0 auto 14px",
          background: `${C.primary}12`, display: "grid", placeItems: "center", fontSize: 26,
        }}>💬</div>
        <h2 className="cm-d" style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.4px", margin: 0 }}>
          אימות מספר טלפון
        </h2>
        <p style={{ margin: "9px auto 0", maxWidth: 310, fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>
          שלחנו קוד בן 6 ספרות בהודעת SMS למספר
          <br /><b style={{ color: C.ink, direction: "ltr", display: "inline-block" }}>{pretty || "—"}</b>
        </p>
      </div>

      <div style={{ display: "flex", gap: 7, justifyContent: "center", direction: "ltr" }}>
        {digits.map((c, i) => (
          <div key={i} style={{
            width: 44, height: 54, borderRadius: 12,
            border: `1.5px solid ${c.trim() ? C.primary : C.line}`,
            background: c.trim() ? `${C.primary}0A` : C.surface,
            display: "grid", placeItems: "center",
            fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums",
          }}>{c.trim()}</div>
        ))}
      </div>

      <input value={d.code} inputMode="numeric" maxLength={6}
        onChange={(v) => set("code", v.target.value.replace(/\D/g, ""))}
        onBlur={() => mark("code")}
        placeholder="הזן את הקוד"
        style={{ marginTop: 16, textAlign: "center", letterSpacing: "4px", fontVariantNumeric: "tabular-nums" }} />
      {t.code && e.code && <Err>{e.code}</Err>}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>
        {sec > 0
          ? `אפשר לבקש קוד חדש בעוד ${sec} שניות`
          : <span style={{ color: C.primary, cursor: "pointer", fontWeight: 700 }}
              onClick={() => setSec(30)}>שליחת קוד חדש</span>}
      </div>
    </div>
  );
}

function Intro({ d, set, mark, t, e }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <h2 className="cm-d" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.5px", lineHeight: 1.25, margin: 0 }}>
        שאלות היכרות קצרות
      </h2>
      <p style={{ margin: "8px 0 20px", fontSize: 14.5, color: C.inkSoft, lineHeight: 1.5 }}>
        התשובות יעזרו לנו להתאים לך את המערכת. ארבע שאלות, בלי הקלדה.
      </p>

      <Pick label="כמה זמן העסק קיים?" opts={TENURE} val={d.tenure}
        onPick={(v) => { set("tenure", v); mark("tenure"); }} err={t.tenure && e.tenure} cols={2} />

      <Pick label="סוג העוסק שלך" opts={BIZTYPE} val={d.bizType}
        onPick={(v) => { set("bizType", v); mark("bizType"); }} err={t.bizType && e.bizType} cols={2} />

      <Pick label="איך הפקת מסמכים עד עכשיו?" opts={PRIOR} val={d.prior}
        onPick={(v) => { set("prior", v); mark("prior"); }} err={t.prior && e.prior} cols={1} />

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>מה תחום העיסוק שלך?</div>
        <button className="chip" onClick={() => setOpen(true)} style={{
          width: "100%", textAlign: "right", padding: "13px 14px", borderRadius: 13,
          border: `1.5px solid ${d.occupation ? C.primary : (t.occupation && e.occupation ? C.danger : C.line)}`,
          background: d.occupation ? `${C.primary}0A` : C.surface, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 9,
        }}>
          <span style={{ fontSize: 15, opacity: .5 }}>🔍</span>
          <span style={{
            flex: 1, fontSize: 15, fontWeight: d.occupation ? 700 : 500,
            color: d.occupation ? C.ink : "#B5B2C4",
          }}>{d.occupation || "חפש או בחר מהרשימה"}</span>
        </button>
        {t.occupation && e.occupation && <Err>{e.occupation}</Err>}
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 9 }}>
        <Check on={d.ecommerce} onToggle={() => set("ecommerce", !d.ecommerce)}
          label="יש לי אתר מכירות (איקומרס)" />
        <Check on={d.micro} onToggle={() => set("micro", !d.micro)}
          label="אני מוגדר/ת כעסק זעיר במס הכנסה" />
      </div>

      {open && <OccPicker onClose={() => setOpen(false)}
        onPick={(v) => { set("occupation", v); mark("occupation"); setOpen(false); }} />}
    </div>
  );
}

function OccPicker({ onClose, onPick }) {
  const [q, setQ] = useState("");
  const inp = useRef(null);
  useEffect(() => { inp.current?.focus(); }, []);

  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return null;
    return FLAT.filter((x) => x.full.includes(s)).slice(0, 40);
  }, [q]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(27,26,46,.42)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
    }}>
      <div className="sheetIn" onClick={(ev) => ev.stopPropagation()} dir="rtl" style={{
        width: "100%", maxWidth: 440, maxHeight: "82vh", background: C.surface,
        borderRadius: "22px 22px 0 0", padding: "14px 16px 22px",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: C.line, margin: "0 auto 14px" }} />
        <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="הקלד עיסוק או מקצוע" style={{ marginBottom: 12 }} />

        <div style={{ overflowY: "auto", flex: 1 }}>
          {!results && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, margin: "4px 0 8px" }}>
                הנפוצים ביותר
              </div>
              {POPULAR.map((p) => (
                <Row key={p} text={p} onClick={() => onPick(p)} />
              ))}
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, margin: "16px 0 8px" }}>
                כל התחומים
              </div>
              {Object.keys(TAX).map((g) => (
                <Row key={g} text={g} sub={`${TAX[g].length} מקצועות`}
                  onClick={() => setQ(g)} />
              ))}
            </>
          )}
          {results && results.length === 0 && (
            <div style={{ padding: "24px 4px", textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
              לא נמצאה התאמה.
              <div style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => onPick(`אחר — ${q.trim()}`)} style={{
                  border: "none", background: C.primary, color: "#fff", fontWeight: 700,
                  fontSize: 14, padding: "10px 18px", borderRadius: 11, cursor: "pointer",
                }}>הוסף „{q.trim()}״ כאחר</button>
              </div>
            </div>
          )}
          {results && results.map((x) => (
            <Row key={x.full} text={x.i} sub={x.g} onClick={() => onPick(x.full)} />
          ))}
        </div>
      </div>
    </div>
  );
}
function Row({ text, sub, onClick }) {
  return (
    <div className="taxrow" onClick={onClick} style={{
      padding: "11px 10px", borderRadius: 10, cursor: "pointer",
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{text}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BizDetails({ d, set, mark, t, e, needsNumbering }) {
  const prefilled = d.vatId && d.vatId === d.taxId;
  const exempt = d.bizType === "עוסק פטור";
  return (
    <div>
      <h2 className="cm-d" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.5px", margin: 0 }}>
        פרטי העסק
      </h2>
      <p style={{ margin: "8px 0 18px", fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>
        אלה הפרטים שיופיעו על כל מסמך. אפשר לעדכן בכל שלב בהגדרות.
      </p>

      <div style={{
        background: C.paper, border: `1.5px dashed ${C.line}`,
        borderRadius: 16, padding: "14px 16px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, marginBottom: 9, letterSpacing: ".3px" }}>
          כך ייראה ראש המסמכים שלך
        </div>
        <div style={{ background: C.surface, borderRadius: 11, padding: "13px 14px", border: `1px solid ${C.line}` }}>
          <div className="cm-d fieldFill" key={d.bizName}
            style={{ fontWeight: 700, fontSize: 16.5, minHeight: 22 }}>
            {d.bizName || <span style={{ color: "#C9C6D8" }}>שם העסק</span>}
          </div>
          <div className="fieldFill" key={d.vatId}
            style={{ fontSize: 13, color: C.inkSoft, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
            {d.bizType === "חברה בע״מ" ? "ח.פ " : "עוסק "}{d.vatId || "—"}
            {exempt && <span style={{ color: C.mint, fontWeight: 700 }}> · פטור ממע״מ</span>}
          </div>
          {(d.city || d.address) && (
            <div className="fieldFill" style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>
              {[d.address, d.city].filter(Boolean).join(", ")}
            </div>
          )}
          {d.startNumber && (
            <div className="fieldFill" style={{
              fontSize: 12, color: C.primary, marginTop: 7, fontWeight: 700,
              borderTop: `1px solid ${C.line}`, paddingTop: 7,
            }}>מסמך מס׳ {d.startNumber}</div>
          )}
        </div>
      </div>

      <F label={d.bizType === "חברה בע״מ" ? "מספר ח.פ" : "מספר עוסק"}
         hint="כפי שמעודכן ברשות המסים" err={t.vatId && e.vatId}>
        <input value={d.vatId} inputMode="numeric" maxLength={9}
          onChange={(v) => set("vatId", v.target.value.replace(/\D/g, ""))}
          onBlur={() => mark("vatId")} className={t.vatId && e.vatId ? "err" : ""}
          placeholder="000000000" style={{ letterSpacing: "2px", fontVariantNumeric: "tabular-nums" }} />
      </F>
      {prefilled && (
        <div className="fieldFill" style={{
          marginTop: 7, fontSize: 12.5, color: C.ink, fontWeight: 600,
          background: `${C.mint}12`, border: `1px solid ${C.mint}40`,
          borderRadius: 10, padding: "9px 11px", lineHeight: 1.45,
        }}>
          מילאנו לך מתעודת הזהות — אצל רוב העצמאים המספרים זהים. אפשר לשנות.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <F label="שם העסק" err={t.bizName && e.bizName}>
          <input value={d.bizName} onChange={(v) => set("bizName", v.target.value)}
            onBlur={() => mark("bizName")} className={t.bizName && e.bizName ? "err" : ""}
            placeholder="סטודיו לוי" />
        </F>
        {!d.bizName && (d.first || d.last) && (
          <button className="chip" onClick={() => set("bizName", [d.first, d.last].filter(Boolean).join(" "))}
            style={{
              marginTop: 8, background: C.surface, border: `1.5px solid ${C.line}`,
              borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700,
              color: C.primary, cursor: "pointer",
            }}>
            + העסק על שמי — {[d.first, d.last].filter(Boolean).join(" ")}
          </button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <F label="שם העסק באנגלית" hint="לחשבוניות ללקוחות בחו״ל. אפשר להשלים בהמשך.">
          <input value={d.bizNameEn} onChange={(v) => set("bizNameEn", v.target.value)}
            placeholder="Levi Studio" dir="ltr" style={{ textAlign: "left" }} />
        </F>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <F label="יישוב" err={t.city && e.city}>
          <input value={d.city} onChange={(v) => set("city", v.target.value)}
            onBlur={() => mark("city")} className={t.city && e.city ? "err" : ""} placeholder="תל אביב" />
        </F>
        <F label="כתובת" err={t.address && e.address}>
          <input value={d.address} onChange={(v) => set("address", v.target.value)}
            onBlur={() => mark("address")} className={t.address && e.address ? "err" : ""}
            placeholder="הרצל 10" />
        </F>
      </div>

      {needsNumbering && (
        <div className="fieldFill" style={{
          marginTop: 18, background: `${C.primary}08`,
          border: `1px solid ${C.primary}22`, borderRadius: 14, padding: "14px",
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
            המשך רצף המספור
          </div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 11, lineHeight: 1.45 }}>
            {d.prior === "פנקס חשבוניות ידני"
              ? "המספור חייב להמשיך מהפנקס ולא להתחיל מחדש."
              : "המספור חייב להמשיך מהמערכת הקודמת ולא להתחיל מחדש."}
          </div>
          <input value={d.startNumber} inputMode="numeric"
            onChange={(v) => set("startNumber", v.target.value.replace(/\D/g, ""))}
            onBlur={() => mark("startNumber")} placeholder="מספר המסמך הבא — למשל 1001"
            style={{ fontVariantNumeric: "tabular-nums" }} />
          {t.startNumber && e.startNumber && <Err>{e.startNumber}</Err>}
        </div>
      )}
    </div>
  );
}

function Done({ d, onReset }) {
  const exempt = d.bizType === "עוסק פטור";
  const steps = d.prior === "מערכת דיגיטלית אחרת"
    ? ["ייבוא לקוחות ופריטים מהמערכת הקודמת", "חיבור לרשות המסים לקבלת מספרי הקצאה", "בדיקת עיצוב המסמך"]
    : d.prior === "פנקס חשבוניות ידני"
    ? ["חיבור לרשות המסים לקבלת מספרי הקצאה", "הפקת המסמך הראשון בהמשך לרצף", "הוספת לוגו וחתימה"]
    : d.prior === "רואה חשבון מפיק עבורי"
    ? ["חיבור לרשות המסים לקבלת מספרי הקצאה", "הפקת המסמך הראשון", "הגדרת דוח חודשי"]
    : ["מדריך: מה חייב להופיע על כל מסמך", "חיבור לרשות המסים לקבלת מספרי הקצאה", "הפקת המסמך הראשון"];

  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <div style={{
          width: 66, height: 66, borderRadius: 21, margin: "0 auto 14px",
          background: `linear-gradient(135deg,${C.mint},${C.primary})`,
          display: "grid", placeItems: "center", animation: "pop .5s both",
          boxShadow: `0 14px 34px ${C.primary}40`,
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="cm-d" style={{ fontSize: 25, fontWeight: 700, margin: 0, letterSpacing: "-.5px" }}>
          הכל מוכן{d.first ? `, ${d.first}` : ""}
        </h1>
      </div>

      <div style={{
        background: C.surface, border: `1.5px solid ${C.line}`, borderRadius: 16,
        padding: "16px 18px", boxShadow: "0 8px 24px rgba(27,26,46,.05)",
      }}>
        <div className="cm-d" style={{ fontWeight: 700, fontSize: 16.5 }}>{d.bizName}</div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4 }}>
          {d.bizType === "חברה בע״מ" ? "ח.פ " : "עוסק "}{d.vatId}
          {exempt && <span style={{ color: C.mint, fontWeight: 700 }}> · פטור ממע״מ</span>}
        </div>
        <div style={{ height: 1, background: C.line, margin: "13px 0" }} />
        <KV k="תחום" v={d.occupation} />
        <KV k="ותק" v={d.tenure} />
        <KV k="כתובת" v={[d.address, d.city].filter(Boolean).join(", ")} />
        {d.startNumber && <KV k="מסמך הבא" v={`מס׳ ${d.startNumber}`} />}
        {d.micro && <KV k="סיווג" v="עסק זעיר" />}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.inkSoft, marginBottom: 10 }}>
          הצעדים הראשונים שלך
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 11, alignItems: "center",
              background: C.surface, border: `1px solid ${C.line}`,
              borderRadius: 13, padding: "13px 14px",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${C.line}`, display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 800, color: C.inkSoft,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn" onClick={onReset} style={{
        marginTop: 22, width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg,${C.primary},${C.primaryDeep})`, color: "#fff",
        fontWeight: 800, fontSize: 16.5, fontFamily: "'Rubik',sans-serif",
        boxShadow: `0 12px 28px ${C.primary}44`,
      }}>להפקת המסמך הראשון ←</button>
      <button onClick={onReset} style={{
        marginTop: 12, width: "100%", background: "none", border: "none",
        color: C.inkSoft, fontWeight: 600, fontSize: 13.5, cursor: "pointer",
      }}>להריץ שוב ↺</button>
    </div>
  );
}

function Stepper({ step, labels }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
        {labels.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 99,
            background: i <= step ? C.primary : C.line, transition: "background .35s",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
        <span>{labels[step]}</span>
        <span>{step + 1} מתוך {labels.length}</span>
      </div>
    </div>
  );
}
function Pick({ label, opts, val, onPick, err, cols = 2 }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 7 }}>
        {opts.map((o) => {
          const sel = val === o;
          return (
            <button key={o} className="chip" onClick={() => onPick(o)} style={{
              background: sel ? `${C.primary}0F` : C.surface,
              border: `1.5px solid ${sel ? C.primary : C.line}`,
              borderRadius: 12, padding: "11px 10px", cursor: "pointer",
              textAlign: cols === 1 ? "right" : "center",
              fontWeight: 700, fontSize: 13.5, color: C.ink, lineHeight: 1.3,
            }}>{o}</button>
          );
        })}
      </div>
      {err && <Err>{err}</Err>}
    </div>
  );
}
function Check({ on, onToggle, label }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      background: on ? `${C.primary}0A` : C.surface,
      border: `1.5px solid ${on ? C.primary : C.line}`,
      borderRadius: 13, padding: "12px 13px",
    }}>
      <input type="checkbox" checked={on} onChange={onToggle}
        style={{ width: 17, height: 17, accentColor: C.primary, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
    </label>
  );
}
function F({ label, hint, err, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
      {hint && !err && <div style={{ marginTop: 5, fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>{hint}</div>}
      {err && <Err>{err}</Err>}
    </div>
  );
}
function Err({ children }) {
  return <div style={{ marginTop: 6, fontSize: 12.5, color: C.danger, fontWeight: 700, lineHeight: 1.4 }}>{children}</div>;
}
function Good({ children }) {
  return <div className="fieldFill" style={{ marginTop: 6, fontSize: 12.5, color: C.mint, fontWeight: 700 }}>✓ {children}</div>;
}
function Rule({ ok, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
      <span style={{
        width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
        background: ok ? C.mint : "transparent", border: `1.5px solid ${ok ? C.mint : C.line}`,
        display: "grid", placeItems: "center", fontSize: 9, color: "#fff", fontWeight: 900,
      }}>{ok ? "✓" : ""}</span>
      <span style={{ fontSize: 12, color: ok ? C.ink : C.inkSoft, fontWeight: ok ? 700 : 500 }}>{children}</span>
    </div>
  );
}
function KV({ k, v }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "4px 0", fontSize: 13.5 }}>
      <span style={{ color: C.inkSoft, flexShrink: 0 }}>{k}</span>
      <span style={{ fontWeight: 700, textAlign: "left" }}>{v}</span>
    </div>
  );
}
