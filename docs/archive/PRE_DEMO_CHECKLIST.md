# Pre-Demo Checklist — countme @ EY Momentum

Run through this list the day BEFORE the EY presentation. Each item is concrete and takes <5 minutes.

---

## ☐ 1. Local environment is fresh (do first)

```bash
git pull
rm -rf .next                    # clear Turbopack cache (Next 16 is sticky)
npm install                     # in case deps changed
npm run build                   # should be green; no type errors
npm run dev                     # http://localhost:3000
```

Check by hand:
- `/` loads the landing page
- `/setup` wizard advances through all 6 steps with the dana-cohen sample
- `/demo` loads with the **form first**, big "ראה הערכת מס שנתית →" CTA visible
- Click the CTA → estimate panel appears; "← חזור לדו״ח" works
- Click any red-coded number on the form → tooltip with formula opens
- Chat panel greets the persona by **name** (not always "דנה")

---

## ☐ 2. E2E tests pass locally

```bash
npx playwright install chromium    # first time only
npm run test:e2e
```

Should be 6 passing tests across `/demo`, `/setup`, and `/api/chat`.
If any fail, **don't deploy** — fix first.

---

## ☐ 3. Vercel — env vars and notifications

In the Vercel dashboard for the `countmedemo` project:

**Settings → Environment Variables** (Production + Preview):
- `ANTHROPIC_API_KEY` — your Anthropic key
- (Anything else from `.env.template` that's marked required)

**Settings → Notifications:**
- ☑ **Failed Deployments** — email on failure
- ☑ **Spend Threshold Reached** — set cap to **$5** for the demo period

**Settings → Domains:**
- Verify the demo URL is the one you'll show on stage
- If using a custom domain, double-check DNS resolves before showtime

---

## ☐ 4. Anthropic Console — spend cap

[console.anthropic.com](https://console.anthropic.com) → Settings → Limits:
- **Monthly spend limit:** $30 (stop-gap if our per-IP rate limit fails)
- **Email alerts:** enable warning at 80% of cap

This is a belt-and-suspenders backup for the in-app rate limit
(12 req/min per IP, see `src/app/api/chat/route.ts`).

---

## ☐ 5. Smoke test on the deployed URL

After the latest deploy is live:

- Open the prod URL in **incognito** (no localStorage from earlier sessions)
- `/setup` → fill in your real numbers → "הציגי את הדוח שלי"
- `/demo` → form loads with **your** values, not Dana's
- Click 3-4 calculated values → tooltips open with correct formulas
- Open chat → ask: "כמה מס אצטרך לשלם השנה?" → response streams correctly
- Click "ראה הערכת מס שנתית" → numbers match what you'd compute by hand

---

## ☐ 6. Rollback plan rehearsed

In Vercel → Deployments:
- Identify the **previous good deployment**
- Hover → ⋯ → "Promote to Production"
- Confirm — should switch in <30 seconds

If on stage and something breaks: open Vercel on your phone, promote previous deployment, refresh the demo screen.

---

## ☐ 7. Browser tab strategy for the live demo

Three tabs ready, in this order (right-to-left on the dock):

1. **gov.il Form 1301** — already logged in, ready to paste values
2. **countme `/demo`** — your persona loaded, form phase
3. **countme `/setup`** — in case someone asks "how do I update?"

Optional 4th tab: a Vercel deployment URL (for the rollback story if it comes up).

---

## ☐ 8. Browser zoom + window size

- Zoom level: **100%** (Ctrl+0 / Cmd+0)
- Window: maximize on the demo screen — the layout is optimized for ≥1280px wide
- Light mode (the form mimics gov.il's light theme; dark would look broken)

---

## After the demo

- **Capture analytics** before stop spending: Vercel → Analytics → Last 24h
- **Note the questions you got** in `docs/ey-demo-feedback.md` (create if not exists)
- **Plan Day 2:** Supabase wiring, Codex review hook, context-mode MCP
