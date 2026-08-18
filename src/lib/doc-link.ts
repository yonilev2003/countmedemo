/**
 * Signed public document links (approved by Yoni 2026-07-19).
 *
 * A share link carries the document payload itself, HMAC-signed and
 * expiry-stamped, so the recipient needs no login and the server needs no DB
 * read (documents live in the owner's persona). Tampering breaks the
 * signature; expiry (90 days) bounds the exposure window.
 *
 * PII note (WS7): the payload includes customer name and business identity —
 * the same data the printed document shows. Sharing is always an explicit
 * user action. Feature is DISABLED entirely until DOC_LINK_SECRET is set.
 */

import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const DOC_LINK_TTL_DAYS = 90;

// Base62, no ambiguous-character exclusions — this id is never hand-typed,
// only tapped from a link, so 0/O and 1/l/I collisions don't matter and a
// full 62-symbol alphabet keeps entropy-per-char maximal.
const SHORT_ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SHORT_ID_LENGTH = 9;

/**
 * Opaque short id for /s/{id} share links (QA #32 fix — see the
 * doc_short_links migration for why: the full signed token is too long for
 * WhatsApp's own linkifier to recognize as one URL).
 *
 * crypto.randomInt is a CSPRNG with a rejection-sampled uniform draw per
 * character (no modulo-bias from randomBytes % 62), so every character of
 * the 9-char id is drawn uniformly from all 62 symbols independently.
 */
export function generateShortId(length: number = SHORT_ID_LENGTH): string {
  if (!Number.isInteger(length) || length < 8 || length > 10) {
    throw new Error("short id length must be an integer between 8 and 10");
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORT_ID_ALPHABET[randomInt(SHORT_ID_ALPHABET.length)];
  }
  return out;
}

export interface SharedDocPayload {
  v: 1;
  exp: number; // unix seconds
  doc: {
    invoiceNumber: string;
    date: string;
    customerName: string;
    description: string;
    amount: number;
    vat: number;
    total: number;
    docType: string;
    dueDate?: string;
    validUntil?: string;
  };
  business: {
    tradeName: string;
    osekType: "patur" | "morshe";
  };
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function isDocLinkEnabled(): boolean {
  return Boolean(process.env.DOC_LINK_SECRET?.trim());
}

/** Create a signed token. Throws when the feature is not configured. */
export function createDocToken(
  payload: Omit<SharedDocPayload, "v" | "exp">,
  nowMs: number = Date.now(),
): string {
  const secret = process.env.DOC_LINK_SECRET?.trim();
  if (!secret) throw new Error("DOC_LINK_SECRET not configured");
  const full: SharedDocPayload = {
    v: 1,
    exp: Math.floor(nowMs / 1000) + DOC_LINK_TTL_DAYS * 24 * 60 * 60,
    ...payload,
  };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  return `${body}.${sign(body, secret)}`;
}

/** Verify + decode. Returns null on any failure (bad sig, expired, malformed). */
export function verifyDocToken(
  token: string,
  nowMs: number = Date.now(),
): SharedDocPayload | null {
  const secret = process.env.DOC_LINK_SECRET?.trim();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SharedDocPayload;
    if (payload.v !== 1) return null;
    if (payload.exp * 1000 < nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}
