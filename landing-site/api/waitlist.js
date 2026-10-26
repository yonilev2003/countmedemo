'use strict';

// POST /api/waitlist  { email, phone, consent: true }
// Stores the signup in Supabase (service role) and sends the confirmation
// email through Resend. A failed email never loses the signup: the row is kept
// with confirmation_sent_at = null so it can be re-sent. A failed STORE is a
// real error (HTTP 500) — the form shows it instead of a fake success.

const lib = require('./_lib');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return lib.send(res, 405, { error: 'method_not_allowed' });
  }

  const ip = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || 'unknown';
  if (lib.rateLimited(ip, 8, 10 * 60 * 1000)) return lib.send(res, 429, { error: 'too_many_requests' });

  const body = readBody(req);
  if (body.website) return lib.send(res, 200, { ok: true }); // honeypot: pretend success

  const email = lib.normalizeEmail(body.email);
  const phone = lib.normalizePhone(body.phone);
  if (!lib.validEmail(email)) return lib.send(res, 400, { error: 'invalid_email' });
  if (!phone) return lib.send(res, 400, { error: 'invalid_phone' });
  if (body.consent !== true) return lib.send(res, 400, { error: 'consent_required' });

  const cfg = lib.supabaseConfig();
  if (!cfg) {
    console.error('[waitlist] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
    return lib.send(res, 500, { error: 'not_configured' });
  }

  let row;
  try {
    const ins = await lib.supabase(
      cfg,
      'POST',
      'waitlist_signups',
      {
        email,
        phone,
        consent_text_version: lib.CONSENT_TEXT_VERSION,
        user_agent: String((req.headers && req.headers['user-agent']) || '').slice(0, 300) || null,
      },
      { Prefer: 'return=representation' }
    );
    if (ins.status === 409) return lib.send(res, 200, { ok: true, alreadyRegistered: true }); // unique email
    if (!ins.ok) {
      console.error('[waitlist] insert failed', ins.status, JSON.stringify(ins.data).slice(0, 300));
      return lib.send(res, 500, { error: 'store_failed' });
    }
    row = Array.isArray(ins.data) ? ins.data[0] : ins.data;
  } catch (e) {
    console.error('[waitlist] insert error', e && e.message);
    return lib.send(res, 500, { error: 'store_failed' });
  }

  let emailSent = false;
  try {
    const sent = await lib.sendConfirmation(email);
    emailSent = sent.ok;
    const patch = sent.ok
      ? { confirmation_sent_at: new Date().toISOString(), confirmation_error: null }
      : { confirmation_error: String(sent.error).slice(0, 500) };
    if (!sent.ok) console.error('[waitlist] confirmation email failed:', sent.error);
    if (row && row.id) {
      await lib.supabase(cfg, 'PATCH', `waitlist_signups?id=eq.${encodeURIComponent(row.id)}`, patch);
    }
  } catch (e) {
    console.error('[waitlist] confirmation step error', e && e.message);
  }

  return lib.send(res, 200, { ok: true, emailSent });
};
