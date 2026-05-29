# crm-snapshot

This directory is a **snapshot of the standalone countme-crm project**, committed here temporarily because the dedicated `countme-crm` GitHub repo hasn't been created yet. Once the standalone repo exists, this whole folder should be deleted from countmedemo and the snapshot moved over.

It is excluded from countmedemo's `tsconfig.json`, so `npm run build` at the countmedemo root will not try to compile it. Treat it as an opaque payload.

## Run it locally

From this directory (`countmedemo/crm-snapshot`):

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app starts in **Demo Mode** automatically (no Supabase / Google / Anthropic setup needed). Seeded Hebrew data — three team members, channels, contacts, projects, tasks, documents, calendar events — appears throughout the UI. Mutations work in-memory; restarting the dev server resets to seed.

To switch to live mode: copy `.env.template` to `.env.local`, fill in the real Supabase + Google + Anthropic + Resend keys, restart `npm run dev`.

## Move to its own repo (when ready)

```bash
# 1. Create the GitHub repo `yonilev2003/countme-crm` (empty)
# 2. From inside countmedemo/crm-snapshot:
git init
git remote add origin https://github.com/yonilev2003/countme-crm.git
git add -A
git commit -m "Initial scaffold of countme-crm"
git push -u origin main
# 3. Back in countmedemo, delete crm-snapshot and the tsconfig.exclude entry
```

See the regular `README.md` in this directory for the full feature breakdown.
