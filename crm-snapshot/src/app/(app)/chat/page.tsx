import { ChatIcon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";

export default function ChatIndex() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState
        icon={<ChatIcon />}
        title="בחר ערוץ או התחל שיחה"
        description="בחר ערוץ מהצד או צור הודעה ישירה כדי להתחיל"
      />
    </div>
  );
}
