"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type TaskPick = { id: string; title: string };

export function TaskDependencyPicker({
  open,
  onOpenChange,
  candidates,
  initialSelected,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: TaskPick[];
  initialSelected: string[];
  onSave: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    if (open) setSelected(initialSelected);
  }, [open, initialSelected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="תלויות במשימות אחרות"
      description="המשימה הזו תתחיל רק אחרי שהמסומנות יסתיימו"
      className="max-w-md"
    >
      <div className="max-h-80 overflow-y-auto py-2">
        {candidates.length === 0 && (
          <div className="text-sm text-surface-500 py-4 text-center">
            אין משימות אחרות בפרויקט
          </div>
        )}
        <ul className="space-y-1">
          {candidates.map((t) => (
            <li key={t.id}>
              <label className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={() => toggle(t.id)}
                  className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-800">{t.title}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          ביטול
        </Button>
        <Button
          onClick={() => {
            onSave(selected);
            onOpenChange(false);
          }}
        >
          שמור
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
