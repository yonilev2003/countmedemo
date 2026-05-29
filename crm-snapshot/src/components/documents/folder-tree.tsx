"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FolderIcon, DocsIcon, PlusIcon, ChevronDownIcon, ChevronLeftIcon } from "@/components/ui/icon";
import { NewDocumentButton } from "./new-document-button";
import { NewFolderButton } from "./new-folder-button";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface Doc {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
}

export function FolderTree({
  workspaceId,
  folders,
  documents,
}: {
  workspaceId: string;
  folders: Folder[];
  documents: Doc[];
}) {
  const pathname = usePathname();

  // Build folder tree
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const arr = byParent.get(f.parent_folder_id) ?? [];
    arr.push(f);
    byParent.set(f.parent_folder_id, arr);
  }

  const docsByFolder = new Map<string | null, Doc[]>();
  for (const d of documents) {
    const arr = docsByFolder.get(d.folder_id) ?? [];
    arr.push(d);
    docsByFolder.set(d.folder_id, arr);
  }

  return (
    <div className="w-72 flex flex-col bg-surface-50 border-s border-surface-200">
      <div className="p-3 border-b border-surface-200 flex items-center justify-between">
        <h2 className="text-base font-semibold text-surface-900">מסמכים</h2>
        <div className="flex gap-1">
          <NewFolderButton workspaceId={workspaceId} parentFolderId={null} compact />
          <NewDocumentButton workspaceId={workspaceId} compact />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <RenderTree
          folders={byParent.get(null) ?? []}
          docs={docsByFolder.get(null) ?? []}
          allFoldersByParent={byParent}
          allDocsByFolder={docsByFolder}
          depth={0}
          activePath={pathname}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}

function RenderTree({
  folders,
  docs,
  allFoldersByParent,
  allDocsByFolder,
  depth,
  activePath,
  workspaceId,
}: {
  folders: Folder[];
  docs: Doc[];
  allFoldersByParent: Map<string | null, Folder[]>;
  allDocsByFolder: Map<string | null, Doc[]>;
  depth: number;
  activePath: string;
  workspaceId: string;
}) {
  return (
    <ul className="flex flex-col">
      {folders.map((f) => (
        <FolderNode
          key={f.id}
          folder={f}
          docs={allDocsByFolder.get(f.id) ?? []}
          subfolders={allFoldersByParent.get(f.id) ?? []}
          allFoldersByParent={allFoldersByParent}
          allDocsByFolder={allDocsByFolder}
          depth={depth}
          activePath={activePath}
          workspaceId={workspaceId}
        />
      ))}
      {docs.map((d) => (
        <li key={d.id}>
          <Link
            href={`/docs/${d.id}`}
            className={cn(
              "flex items-center gap-2 rounded-md py-1.5 px-2 text-sm",
              activePath === `/docs/${d.id}`
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-surface-700 hover:bg-surface-100",
            )}
            style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
          >
            <DocsIcon className="h-4 w-4 text-surface-400 shrink-0" />
            <span className="truncate">{d.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FolderNode({
  folder,
  docs,
  subfolders,
  allFoldersByParent,
  allDocsByFolder,
  depth,
  activePath,
  workspaceId,
}: {
  folder: Folder;
  docs: Doc[];
  subfolders: Folder[];
  allFoldersByParent: Map<string | null, Folder[]>;
  allDocsByFolder: Map<string | null, Doc[]>;
  depth: number;
  activePath: string;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(true);
  const empty = subfolders.length === 0 && docs.length === 0;

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded-md py-1.5 pe-1 hover:bg-surface-100 group"
        style={{ paddingInlineStart: `${depth * 16 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="p-0.5 rounded text-surface-400 hover:text-surface-700"
          aria-label={open ? "סגור" : "פתח"}
          disabled={empty}
        >
          {empty ? (
            <span className="inline-block w-3" />
          ) : open ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          )}
        </button>
        <FolderIcon className="h-4 w-4 text-surface-500 shrink-0" />
        <span className="text-sm text-surface-800 flex-1 truncate">{folder.name}</span>
        <div className="opacity-0 group-hover:opacity-100">
          <NewDocumentButton workspaceId={workspaceId} folderId={folder.id} compact />
        </div>
      </div>
      {open && (
        <RenderTree
          folders={subfolders}
          docs={docs}
          allFoldersByParent={allFoldersByParent}
          allDocsByFolder={allDocsByFolder}
          depth={depth + 1}
          activePath={activePath}
          workspaceId={workspaceId}
        />
      )}
    </li>
  );
}
