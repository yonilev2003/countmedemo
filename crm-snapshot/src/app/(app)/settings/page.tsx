import { requireSession } from "@/lib/auth";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsGeneralPage() {
  const session = await requireSession();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>פרטי מרחב העבודה</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Row label="שם" value={session.workspace.name} />
          <Row label="מזהה" value={session.workspace.id} mono />
          <Row label="נוצר ב" value={new Date(session.workspace.created_at).toLocaleString("he-IL")} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פרטי המשתמש שלך</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Row label="שם" value={session.profile.full_name ?? "—"} />
          <Row label="אימייל" value={session.profile.email} />
          <Row label="התפקיד שלך" value={
            session.role === "owner" ? "בעלים"
              : session.role === "admin" ? "מנהל" : "חבר צוות"
          } />
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="text-sm text-surface-500">{label}</div>
      <div className={mono ? "font-mono text-xs text-surface-700" : "text-sm text-surface-900"}>
        {value}
      </div>
    </div>
  );
}
