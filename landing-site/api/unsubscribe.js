'use strict';

// GET  /api/unsubscribe?e=<email>&t=<hmac>  -> confirmation page with a button
// POST /api/unsubscribe?e=<email>&t=<hmac>  -> performs the unsubscribe
//
// GET deliberately does NOT unsubscribe: mail scanners prefetch links, which
// would silently remove people. POST covers both the page button and the
// one-click List-Unsubscribe-Post header.

const lib = require('./_lib');

function page(title, message, form) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${title} | CountMe</title>
<style>body{margin:0;font-family:Rubik,Arial,sans-serif;background:#EEF4F7;color:#0F1626;display:grid;place-items:center;min-height:100vh;padding:24px}
main{max-width:420px;background:#fff;border-radius:24px;padding:32px;text-align:center;line-height:1.7}
h1{font-size:22px;margin:0 0 8px}p{margin:8px 0;color:#4A5466}
button{margin-top:16px;border:0;border-radius:999px;background:#0F1626;color:#fff;font:inherit;padding:12px 28px;cursor:pointer}
button:focus-visible,a:focus-visible{outline:3px solid #5B3FD9;outline-offset:3px}a{color:#3A2A9A}</style></head>
<body><main><h1>${title}</h1><p>${message}</p>${form || ''}<p><a href="/">חזרה לדף הבית</a></p></main></body></html>`;
}

function html(res, status, body) {
  lib.send(res, status, body, 'text/html; charset=utf-8');
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const email = lib.normalizeEmail(q.e);
  const token = String(q.t || '');

  if (!lib.verifyEmailToken(email, token)) {
    return html(res, 400, page('הקישור אינו תקין', 'אפשר לפנות אלינו בדוא״ל info@countme.co.il ונסיר אותך ידנית.'));
  }

  if (req.method === 'GET') {
    const action = `/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
    return html(
      res,
      200,
      page(
        'הסרה מרשימת התפוצה',
        'לאשר הסרה של הכתובת הזו מרשימת התפוצה של CountMe?',
        `<form method="post" action="${action}"><button type="submit">אישור הסרה</button></form>`
      )
    );
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return lib.send(res, 405, { error: 'method_not_allowed' });
  }

  const cfg = lib.supabaseConfig();
  if (!cfg) return html(res, 500, page('משהו השתבש', 'נסו שוב מאוחר יותר.'));
  try {
    const r = await lib.supabase(
      cfg,
      'PATCH',
      `waitlist_signups?email=eq.${encodeURIComponent(email)}&unsubscribed_at=is.null`,
      { unsubscribed_at: new Date().toISOString() }
    );
    if (!r.ok) {
      console.error('[unsubscribe] update failed', r.status);
      return html(res, 500, page('משהו השתבש', 'נסו שוב מאוחר יותר.'));
    }
  } catch (e) {
    console.error('[unsubscribe] error', e && e.message);
    return html(res, 500, page('משהו השתבש', 'נסו שוב מאוחר יותר.'));
  }
  return html(res, 200, page('הוסרת מהרשימה', 'לא נשלח לך עוד עדכונים ותוכן שיווקי.'));
};
