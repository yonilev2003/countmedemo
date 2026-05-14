"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { useEffect } from "react";
import type { TiptapDoc } from "@/types/db";
import { EditorToolbar } from "./editor-toolbar";

export function DocumentEditor({
  content,
  onChange,
}: {
  content: TiptapDoc;
  onChange: (doc: TiptapDoc) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-brand-600 underline" },
      }),
      Placeholder.configure({ placeholder: "התחל לכתוב..." }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "right",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content as unknown as Parameters<typeof useEditor>[0] extends infer O
      ? O extends { content?: infer C }
        ? C
        : never
      : never,
    editorProps: {
      attributes: {
        class: "prose-doc focus:outline-none px-10 py-8 min-h-[calc(100vh-200px)]",
        dir: "rtl",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as unknown as TiptapDoc);
    },
  });

  // Sync external content changes (e.g., undo via server)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.commands.setContent(content as any, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="max-w-3xl mx-auto">
      <EditorToolbar editor={editor} />
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
