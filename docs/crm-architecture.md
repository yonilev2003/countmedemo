# countme-crm — Architecture

מערכת CRM פנימית לצוות countme. ריפו נפרד (`countme-crm`), פרויקט Vercel נפרד, פרויקט Supabase נפרד. מתועד כאן כדי שיהיה מקור-אמת אחד למה החלטנו ולמה.

## Stack

| שכבה | בחירה | למה |
|---|---|---|
| Framework | Next.js 16 App Router + React 19 + TS + Tailwind 4 | עקביות עם countme |
| DB + Auth + Storage + Realtime | Supabase | חבילה אחת, RLS חזק |
| Auth Provider | Google OAuth | החלטה |
| Rich text | Tiptap + extensions | תמיכת RTL נקייה, JSON עריך |
| Gantt | frappe-gantt + עטיפת RTL (fallback: custom SVG) | MIT, קל |
| Calendar UI | FullCalendar | RTL נתמך |
| Calendar sync | Google Calendar API v3 + sync tokens | bi-directional |
| AI | Anthropic SDK — Sonnet 4.6 (chat), Haiku 4.5 (parsing) | Vision לתמונות/PDF |
| Email | Resend | חינם עד 3K/חודש |
| Hosting | Vercel | החלטה |

## Repo layout

```
countme-crm/
├── src/
│   ├── app/
│   │   ├── (auth)/login              # Google OAuth landing
│   │   ├── auth/callback             # Supabase OAuth callback
│   │   ├── invite/[token]            # קבלת הזמנה
│   │   ├── (app)/                    # workspace-scoped, אחרי auth
│   │   │   ├── chat/[channelId]
│   │   │   ├── contacts/[contactId]
│   │   │   ├── tasks/                # list + kanban + gantt
│   │   │   ├── docs/[docId]
│   │   │   ├── calendar
│   │   │   └── settings              # workspace settings, members
│   │   ├── api/
│   │   │   ├── gantt/parse
│   │   │   ├── calendar/google/{auth,sync,callback}
│   │   │   ├── invitations/{create,accept}
│   │   │   ├── documents/save
│   │   │   └── chat/messages
│   │   └── layout.tsx                # RTL, Heebo, Rubik
│   ├── components/
│   │   ├── ui/                       # Button, Card, Input, Dialog, ...
│   │   ├── shell/                    # Sidebar, TopBar, AppShell
│   │   ├── chat/
│   │   ├── contacts/
│   │   ├── tasks/                    # KanbanBoard, GanttView, TaskList
│   │   ├── documents/                # TiptapEditor, FolderTree
│   │   └── calendar/                 # CalendarView, EventDialog
│   └── lib/
│       ├── supabase/{client,server,admin}.ts
│       ├── google-calendar/
│       ├── gantt-parser/             # CSV/XLSX/PDF/Image parsers
│       ├── ai/                       # Anthropic helpers
│       └── utils.ts
├── supabase/
│   ├── migrations/                   # SQL versioned
│   └── policies/                     # RLS doc
└── public/
```

## Data model (Postgres + RLS)

כל טבלה מקבלת RLS שמסנן לפי `workspace_id` שהמשתמש חבר בו.

**Tenancy**
- `workspaces` (id, name, owner_id)
- `workspace_members` (workspace_id, user_id, role: owner|admin|member)
- `invitations` (workspace_id, email, role, token, expires_at, accepted_at)

**Chat**
- `channels` (workspace_id, name, type: channel|dm, is_private)
- `channel_members` (channel_id, user_id)
- `messages` (channel_id, user_id, content_jsonb, parent_message_id, created_at)
- `message_reactions` (message_id, user_id, emoji)

**Contacts**
- `contacts` (workspace_id, name, company, email, phone, role, status, tags[], created_by)
- `contact_activities` (contact_id, type, body, created_by, occurred_at)
- `contact_owners` (contact_id, user_id)

**Tasks + Gantt**
- `projects` (workspace_id, name, color)
- `tasks` (project_id, title, description, assignee_id, start_date, end_date, status, progress, parent_task_id)
- `task_dependencies` (task_id, depends_on_task_id, type)
- `gantt_imports` (project_id, source_file_url, source_format, raw_ai_response, status)

**Documents**
- `document_folders` (workspace_id, name, parent_folder_id)
- `documents` (workspace_id, folder_id, title, content_jsonb, created_by, updated_by, updated_at)
- `document_versions` (document_id, content_jsonb, created_by, created_at)
- `files` (workspace_id, name, mime, size, storage_path, related_to)

**Calendar**
- `calendar_events` (workspace_id, title, description, start_at, end_at, location, created_by, google_event_id, etag)
- `event_attendees` (event_id, user_id?, external_email?, response)
- `user_google_tokens` (user_id, access_token, refresh_token, expires_at, scopes, sync_token)

## הסכמים שצריך לעמוד עליהם

1. **RLS תמיד דלוק.** אף טבלה לא נחשפת בלי policies.
2. **Service role key רק בצד שרת** (`SUPABASE_SERVICE_ROLE_KEY`). לעולם לא ב-`NEXT_PUBLIC_*`.
3. **כל env var חדש מתועד ב-`.env.template`** עם תיאור.
4. **קוד באנגלית, תוכן בעברית.** הערות בשתי השפות מותרות.
5. **RTL ברירת מחדל.** כל טקסט יוצא צריך לעבור בדיקת ייצור עברית מימין.

## Phasing (3-4 שבועות עבודה אינטנסיבית)

| Milestone | זמן | תוכן |
|---|---|---|
| M1 — Foundation | 3-4 ימים | Repo + Vercel + Supabase + Google OAuth + workspaces + invites + shell UI |
| M2 — Communication | 4-5 ימים | Chat (channels + DMs + realtime) + Contacts (CRUD + activities) + Documents (Tiptap בסיסי + folders) |
| M3 — Project mgmt | 5-7 ימים | Tasks (list + kanban) + Gantt upload + Gantt view + AI prompts על אי-ודאות |
| M4 — Calendar | 4-5 ימים | Internal calendar + Google bi-directional sync + invite |

## סיכונים ידועים

1. **RTL ב-Gantt** — frappe-gantt לא תומך OOTB. fallback: custom SVG. תקציב זמן: 4 שעות לפני מעבר.
2. **.mpp parsing** — בלתי אפשרי בלי Java runtime או שירות בתשלום. הפתרון: תומכים ב-MS Project XML export, ועל .mpp בינארי מציגים הוראות ייצוא.
3. **Google Calendar bi-directional** — sync tokens + conflict resolution מורכבים. M4 v1 = one-way push (App→Google). v2 (אותו milestone) = pull.
4. **עלויות Anthropic** — gantt vision parsing 0.01-0.05$ לקריאה. Rate limit per-user.
5. **Supabase free tier** — 500MB DB + 1GB storage. מספיק ל-3 משתמשים לכמה חודשים.

## Setup checklist (יוני להחזיק)

צד User:
- [ ] צור Vercel project `countme-crm` (חשבון countme, לא אישי)
- [ ] צור Supabase project `countme-crm` (region eu-central-1 או eu-west-1)
- [ ] צור Google Cloud project + OAuth client (Web), redirect URI = `https://<supabase-url>/auth/v1/callback`
- [ ] צור GitHub repo `yonilev2003/countme-crm` ריק
- [ ] צור Resend account + API key
- [ ] תן את כל ה-env values

צד Code (אני):
- [ ] סקאפולד Next.js + Tailwind + RTL
- [ ] migrations + RLS
- [ ] כל המודולים (M1-M4)
- [ ] `.env.template` מלא
- [ ] README עם setup instructions
