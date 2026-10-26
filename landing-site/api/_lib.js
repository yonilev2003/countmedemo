'use strict';

// Shared helpers for the landing page's serverless functions.
// Plain fetch + node:crypto — no npm dependencies (repo convention), CommonJS
// because this project has no package.json. The leading underscore keeps this
// file (and _templates/) from being exposed as routes by Vercel.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SITE_URL = (process.env.SITE_URL || 'https://www.countme.co.il').replace(/\/$/, '');
const CONSENT_TEXT_VERSION = '2026-10-26-single-box';
const DEFAULT_FROM = 'CountMe <onboarding@resend.dev>';
const DEFAULT_SUBJECT = 'שמרנו לך מקום ב-CountMe';
const TIMEOUT_MS = 8000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function env(name) {
  return process.env[name] || '';
}

function send(res, status, body, contentType) {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function validEmail(email) {
  return email.length <= 254 && EMAIL_RE.test(email);
}

// Same normalization the form used to apply for Brevo: digits only, drop the
// country code and leading zeros. Israeli numbers only (8 digits landline, 9 mobile).
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('972')) d = d.slice(3);
  d = d.replace(/^0+/, '');
  return /^\d{8,9}$/.test(d) ? '+972' + d : null;
}

// --- unsubscribe links: HMAC over the lower-cased email --------------------

function secret() {
  const s = env('UNSUBSCRIBE_SECRET') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!s) throw new Error('UNSUBSCRIBE_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set');
  return s;
}

function signEmail(email) {
  return crypto.createHmac('sha256', secret()).update(email).digest('base64url');
}

function verifyEmailToken(email, token) {
  if (!email || !token) return false;
  let expected;
  try {
    expected = Buffer.from(signEmail(email));
  } catch {
    return false;
  }
  const given = Buffer.from(String(token));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function unsubscribeUrl(email) {
  return `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${signEmail(email)}`;
}

// --- Supabase (PostgREST, service role) -----------------------------------

function supabaseConfig() {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return url && key ? { url, key } : null;
}

async function supabase(cfg, method, pathAndQuery, body, extraHeaders) {
  const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, {
    method,
    headers: Object.assign(
      { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      extraHeaders || {}
    ),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

// --- confirmation email (Resend REST) --------------------------------------

function confirmationHtml(email) {
  const tpl = fs.readFileSync(path.join(__dirname, '_templates', 'confirmation.html'), 'utf8');
  return tpl.replace(/\{\{\s*unsubscribe\s*\}\}/g, unsubscribeUrl(email));
}

function confirmationText(email) {
  return [
    'שמרנו לך מקום.',
    '',
    'קיבלנו את הפרטים שלך. כשהפלטפורמה תיפתח, נשלח לך מייל עם ההטבה לפני שזה יוצא לכולם.',
    '',
    'יש שאלה? פשוט עונים למייל הזה.',
    'צוות CountMe',
    '',
    `הסרה מרשימת התפוצה: ${unsubscribeUrl(email)}`,
    'קאונטמי בע״מ (CountMe), שבטי ישראל 23, מודיעין',
  ].join('\n');
}

async function sendConfirmation(email) {
  const key = env('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set' };
  const unsub = unsubscribeUrl(email);
  const payload = {
    from: env('WAITLIST_EMAIL_FROM') || DEFAULT_FROM,
    to: [email],
    subject: env('WAITLIST_EMAIL_SUBJECT') || DEFAULT_SUBJECT,
    html: confirmationHtml(email),
    text: confirmationText(email),
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
  if (env('WAITLIST_REPLY_TO')) payload.reply_to = env('WAITLIST_REPLY_TO');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `resend ${res.status} ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `resend request failed: ${e && e.message}` };
  }
}

// Best-effort per-instance limiter (serverless instances do not share memory,
// so this only blunts a burst from one client; durable limiting is a follow-up).
const hits = new Map();
function rateLimited(ip, limit, windowMs) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return recent.length > limit;
}

module.exports = {
  CONSENT_TEXT_VERSION,
  env,
  send,
  normalizeEmail,
  validEmail,
  normalizePhone,
  signEmail,
  verifyEmailToken,
  unsubscribeUrl,
  supabaseConfig,
  supabase,
  sendConfirmation,
  rateLimited,
};
