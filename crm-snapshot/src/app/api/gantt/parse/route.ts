import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGanttFile } from "@/lib/gantt-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const formData = await request.formData();
  const file = formData.get("file");
  const projectId = formData.get("projectId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ללא קובץ" }, { status: 400 });
  }
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "ללא project" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "קובץ גדול מדי (מקס׳ 25MB)" }, { status: 400 });
  }

  // Verify access to project
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Project לא נמצא" }, { status: 404 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload original file to storage (admin client to bypass RLS race)
  const admin = createAdminClient();
  const storagePath = `${project.workspace_id}/${project.id}/${Date.now()}-${file.name}`;
  await admin.storage.from("gantt-uploads").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  const { data: signedUrl } = await admin.storage
    .from("gantt-uploads")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 1 week

  const outcome = await parseGanttFile({
    filename: file.name,
    mime: file.type,
    buffer,
  });

  if (!outcome.ok) {
    console.error("Gantt parse failed", { error: outcome.error, hint: outcome.hint });
    return NextResponse.json(
      {
        error: "לא הצלחנו לפענח את הקובץ",
        hint: outcome.hint,
        sourceUrl: signedUrl?.signedUrl ?? null,
      },
      { status: 400 },
    );
  }

  // Persist gantt_imports row
  const { data: importRow, error: importErr } = await admin
    .from("gantt_imports")
    .insert({
      project_id: project.id,
      source_file_url: signedUrl?.signedUrl ?? null,
      source_format: outcome.result.format,
      raw_ai_response: outcome.result.raw,
      parsed_tasks: outcome.result.tasks,
      uncertainties: outcome.result.uncertainties,
      status: outcome.result.uncertainties.length > 0 ? "parsed" : "imported",
      uploaded_by: user.id,
    })
    .select("*")
    .single();
  if (importErr || !importRow) {
    console.error("Gantt import insert failed", importErr);
    return NextResponse.json(
      { error: "שמירת היבוא נכשלה" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    importId: importRow.id,
    format: outcome.result.format,
    tasks: outcome.result.tasks,
    uncertainties: outcome.result.uncertainties,
    notes: outcome.result.notes,
    sourceUrl: signedUrl?.signedUrl ?? null,
  });
}
