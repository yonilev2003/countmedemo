import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleConnectButton } from "@/components/calendar/google-connect-button";

export default async function IntegrationsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: tokens } = await supabase
    .from("user_google_tokens")
    .select("scopes, expires_at, primary_calendar_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const connected = !!tokens;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Google Calendar</CardTitle>
            {connected ? (
              <Badge tone="success">מחובר</Badge>
            ) : (
              <Badge tone="neutral">לא מחובר</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-surface-600">
            כשמחברים, אירועים שאתה יוצר ב-CRM יופיעו ביומן Google שלך, ואירועים שאתה יוצר ב-Google יסונכרנו לכאן.
          </p>
          {connected && tokens && (
            <div className="text-xs text-surface-500 font-mono">
              יומן ראשי: {tokens.primary_calendar_id ?? "—"}
            </div>
          )}
          <div>
            <GoogleConnectButton connected={connected} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
