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

## Files that must be added (not in the repo yet)
- `legal/terms-of-use.pdf`, `legal/privacy-policy.pdf` — footer + consent checkbox link to them (404 until added).
- `assets/team-tom.png`, `assets/team-yoni.png`, `assets/team-roy.png`, `assets/team-bng.png` — "מי אנחנו" avatars (blank circles until added).

## Data
The form posts straight from the browser to a Brevo form (`CountMe waiting list` -> list `waiting list`). Nothing is stored in Supabase or on our servers.

When the real app goes live on countme.co.il, move the domain to the `countmedemo` project.
