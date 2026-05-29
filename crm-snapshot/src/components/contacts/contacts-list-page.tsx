"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ContactsIcon,
  PlusIcon,
  SearchIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
} from "@/components/ui/icon";
import { ContactFormDialog } from "./contact-form-dialog";
import { StatusBadge } from "./status-badge";
import { relativeTime } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "כל הסטטוסים" },
  { value: "lead", label: "ליד" },
  { value: "qualified", label: "מסונן" },
  { value: "customer", label: "לקוח" },
  { value: "lost", label: "אבוד" },
  { value: "archived", label: "ארכיון" },
];

export function ContactsListPage({
  workspaceId,
  contacts,
  allTags,
  filters,
}: {
  workspaceId: string;
  contacts: Contact[];
  allTags: string[];
  filters: { q?: string; status?: string; tag?: string };
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.q ?? "");

  function applyFilters(next: { q?: string; status?: string; tag?: string }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    if (next.tag) params.set("tag", next.tag);
    router.push(`/contacts${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">אנשי קשר</h1>
          <p className="text-sm text-surface-600 mt-1">
            {contacts.length} אנשים במערכת
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon /> איש קשר חדש
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ ...filters, q: searchValue });
            }}
            placeholder="חיפוש לפי שם, חברה, אימייל..."
            className="pe-10"
          />
        </div>
        <select
          value={filters.status ?? ""}
          onChange={(e) => applyFilters({ ...filters, status: e.target.value })}
          className="h-10 rounded-lg border border-surface-300 bg-white px-3 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.tag && (
            <button
              onClick={() => applyFilters({ ...filters, tag: undefined })}
              className="text-xs px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 hover:bg-brand-200"
            >
              ✕ הסר סינון תגית
            </button>
          )}
          {allTags.slice(0, 12).map((t) => (
            <button
              key={t}
              onClick={() => applyFilters({ ...filters, tag: t })}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-100 text-surface-700 hover:bg-surface-200"
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={<ContactsIcon />}
          title="אין עדיין אנשי קשר"
          description="הוסף את איש הקשר הראשון שלך כדי להתחיל לעקוב"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon /> איש קשר חדש
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <ul className="divide-y divide-surface-100">
            {contacts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contacts/${c.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors"
                >
                  <Avatar name={c.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-semibold text-surface-900 truncate">{c.name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-surface-500">
                      {c.company && (
                        <span className="inline-flex items-center gap-1">
                          <BuildingIcon className="h-3.5 w-3.5" /> {c.company}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <MailIcon className="h-3.5 w-3.5" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="h-3.5 w-3.5" /> {c.phone}
                        </span>
                      )}
                    </div>
                    {c.tags && c.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.tags.slice(0, 5).map((t) => (
                          <Badge key={t} tone="brand">#{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-surface-400 whitespace-nowrap">
                    {relativeTime(c.updated_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ContactFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
