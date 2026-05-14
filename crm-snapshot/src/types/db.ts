// Hand-curated DB types. After Supabase project is up, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/db.generated.ts
// then re-export. For now this is the source of truth.

export type MemberRole = "owner" | "admin" | "member";
export type ChannelType = "channel" | "dm";
export type ContactStatus = "lead" | "qualified" | "customer" | "lost" | "archived";
export type ActivityType = "note" | "call" | "meeting" | "email" | "task" | "document";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type DependencyType = "FS" | "SS" | "FF" | "SF";
export type ImportStatus = "pending" | "parsed" | "reviewed" | "imported" | "failed";
export type AttendeeResponse = "pending" | "accepted" | "declined" | "tentative";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string | null;
  type: ChannelType;
  is_private: boolean;
  topic: string | null;
  created_by: string;
  created_at: string;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: MessageContent;
  parent_message_id: string | null;
  attachments: MessageAttachment[];
  created_at: string;
  edited_at: string | null;
}

export interface MessageContent {
  text?: string;
  json?: unknown; // Tiptap JSON
}

export interface MessageAttachment {
  file_id: string;
  name: string;
  mime: string;
  size_bytes: number;
  url?: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  status: ContactStatus;
  tags: string[];
  notes: string | null;
  source: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  occurred_at: string;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  contact_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TaskStatus;
  progress: number;
  parent_task_id: string | null;
  contact_id: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  task_id: string;
  depends_on_task_id: string;
  type: DependencyType;
}

export interface ParsedGanttTask {
  title: string;
  description?: string;
  start_date: string | null;     // ISO date or null
  end_date: string | null;
  assignee_hint?: string;
  parent_index?: number;          // index into parsed_tasks array
  progress?: number;
  confidence: number;             // 0..1
  uncertainties?: string[];       // human-readable strings
}

export interface GanttImport {
  id: string;
  project_id: string;
  source_file_url: string | null;
  source_format: string;
  raw_ai_response: unknown;
  parsed_tasks: ParsedGanttTask[];
  uncertainties: GanttUncertainty[];
  status: ImportStatus;
  uploaded_by: string;
  created_at: string;
}

export interface GanttUncertainty {
  task_index: number;
  field: "start_date" | "end_date" | "assignee" | "title";
  reason: string;
  suggestion?: string;
}

export interface DocumentFolder {
  id: string;
  workspace_id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string;
  created_at: string;
}

export interface DocDoc {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  title: string;
  content: TiptapDoc;
  template_key: string | null;
  contact_id: string | null;
  created_by: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface TiptapDoc {
  type: "doc";
  content: unknown[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: TiptapDoc;
  created_by: string;
  created_at: string;
}

export interface FileRow {
  id: string;
  workspace_id: string;
  name: string;
  mime: string | null;
  size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  related_kind: string | null;
  related_id: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  contact_id: string | null;
  task_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  google_etag: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string | null;
  external_email: string | null;
  response: AttendeeResponse;
}

export interface UserGoogleTokens {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scopes: string;
  primary_calendar_id: string | null;
  sync_token: string | null;
  channel_id: string | null;
  channel_resource_id: string | null;
  channel_expires_at: string | null;
  created_at: string;
  updated_at: string;
}
