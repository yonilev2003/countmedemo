# countme landing page (static, waitlist)

Hosted as its own Vercel project (`countme-landing-page`, root directory `landing-site`) and attached to countme.co.il.
No build: Vercel serves the folder as-is. The main app (`countmedemo`) is untouched.

`index.html` is generated from the partner's Claude Design source — don't edit it by hand:

```
countme-site-src/CountMe Waitlist.dc.html   (design source)
        │  python3 scripts/build-landing.py
        ▼
landing-site/index.html
```

When the design changes: replace the source file, run the script, commit both.

## Legal pages
`legal/terms-of-use.html` and `legal/privacy-policy.html` are hand-maintained accessible HTML pages (the original PDFs were untagged iOS exports, which fails IS 5568 part 2, so they are not served). Update the text there directly. Transcribed from the PDFs dated 26.10.2026; the PDFs' "draft for lawyer review" footer line was not carried over.

## Accessibility (IS 5568 / WCAG 2.0 AA)
Fixes live in `PATCHES` inside `scripts/build-landing.py` (contrast, focus ring, live regions, statement content) so they survive a re-export of the design; the build fails loudly if the design changes under a patch.
`a11y-widget.js` + `a11y-widget.css` are the user-preference widget (contrast, text size, line spacing, links, readable font, stop animations; Alt+A). Port of `src/components/a11y/accessibility-widget.tsx` with the same preference schema and localStorage key (`countme_a11y_prefs_v1`). It only toggles classes on `<html>`; it is a comfort tool, not a compliance claim.
Accessibility coordinator (statement): יונתן לוי, 054-6192345, yonilev2003@gmail.com.
Last check: axe-core (0 violations on `/` incl. panel open + all preferences on, and on both legal pages) + keyboard pass, 26.10.2026. Not yet done: manual screen-reader test and an expert opinion — the statement says so.

## Data and consent
The form posts to **our own** `POST /api/waitlist` (`api/waitlist.js`, Vercel serverless, no dependencies): the signup is stored in Supabase (`public.waitlist_signups`, service-role only) and the confirmation email is sent through Resend (template: `api/_templates/confirmation.html`, generated from `countme-site-src/email/` by `scripts/build-landing.py`). Brevo is no longer used.
- A failed store answers 500 and the form shows the error (no fake success). A failed email keeps the signup (`confirmation_sent_at` stays null, `confirmation_error` is filled) so it can be re-sent.
- Duplicate emails answer success without a second email. `/api/unsubscribe` is HMAC-signed; GET only shows a confirm button, POST unsubscribes (also serves the one-click `List-Unsubscribe-Post`).
- One required checkbox (marketing updates + waiting-list terms/privacy). Phone required (Israeli numbers, stored as +972…). `consent_text_version` records which wording was shown.
- Tests: `tests/unit/landing-waitlist.test.ts`.

### One-time setup (Vercel project `countme-landing-page`, Production + Preview env)
1. Apply `supabase/migrations/20261026160000_waitlist_signups.sql` on the countme Supabase project (SQL editor or `supabase db push`).
2. Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (required); `WAITLIST_EMAIL_FROM`, `WAITLIST_REPLY_TO`, `UNSUBSCRIBE_SECRET` (recommended; the secret falls back to the service key).
3. Verify `countme.co.il` in Resend (DNS at LiveDNS), then set `WAITLIST_EMAIL_FROM="CountMe <hello@countme.co.il>"`. Until then the sandbox sender `onboarding@resend.dev` only delivers to the Resend account owner.
4. Reply-To must be a monitored inbox (the email says "just reply").

When the real app goes live on countme.co.il, move the domain to the `countmedemo` project.
