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
The form posts straight from the browser to a Brevo form (`CountMe waiting list` -> list `waiting list`). Nothing is stored in Supabase or on our servers.
Two checkboxes: (1) terms + privacy of the waiting list — required; (2) marketing (email/SMS) — optional. Phone is required. `OPT_IN` is sent **only** when the marketing box is checked.
**Brevo setup needed:** make the `OPT_IN` field *not required* in the form, otherwise a registration without marketing consent is rejected by Brevo (the visitor sees "משהו השתבש"). Marketing campaigns must be sent only to contacts with `OPT_IN` = true; the welcome automation (operational message) can go to everyone on the list.

When the real app goes live on countme.co.il, move the domain to the `countmedemo` project.
