import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tiptapToPdf } from "@/lib/documents/export-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, title, content, workspace_id")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (!document) {
    return NextResponse.json({ error: "המסמך לא נמצא" }, { status: 404 });
  }

  try {
    const pdf = await tiptapToPdf(document.content, document.title);
    const filename = `${document.title || "document"}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF export failed", err);
    return NextResponse.json({ error: "יצירת PDF נכשלה" }, { status: 500 });
  }
}
