# First-time push to GitHub

The local countme-crm scaffold is complete and `git init`'d but **not committed**, because the GitHub remote (`yonilev2003/countme-crm`) doesn't exist yet.

## After you create the GitHub repo

Run from `/home/user/countme-crm`:

```bash
# 1. Verify the remote URL matches the repo you created
git remote -v
# If you used a different name, fix it:
# git remote set-url origin https://github.com/<owner>/<repo>.git

# 2. Stage and commit
git add -A
git commit -m "Initial scaffold of countme-crm"

# 3. Push (this will create the main branch on GitHub)
git push -u origin main
```

That's it. From there:

1. **Vercel**: Import the repo on Vercel → set env vars (see `.env.template`) → deploy.
2. **Supabase**: Create the project → run migrations from `supabase/migrations/` in order in the SQL Editor → enable Google OAuth in Auth Providers → create the two storage buckets (`documents`, `gantt-uploads`).
3. **Google Cloud**: Create OAuth client → set redirect URIs (Supabase auth callback + `<APP_URL>/api/calendar/google/callback`).
4. **Resend**: Create API key.
5. **First login**: Visit the deployed URL → log in with Google → onboarding will create your workspace.
6. **Invite your 2 partners**: Settings → Members → Invite.

If anything's unclear, the README has the full breakdown.
