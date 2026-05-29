"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "@/components/ui/icon";
import { GanttUploadDialog } from "./gantt-upload-dialog";

export function GanttUploadButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UploadIcon /> העלה גאנט
      </Button>
      <GanttUploadDialog open={open} onOpenChange={setOpen} projectId={projectId} />
    </>
  );
}
