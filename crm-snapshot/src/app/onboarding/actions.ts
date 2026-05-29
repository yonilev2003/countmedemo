"use server";

import { redirect } from "next/navigation";
import { requireUser, createWorkspaceForUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function createWorkspaceAction(args: {
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const name = args.name.trim();
  if (name.length < 2) return { ok: false, error: "שם קצר מדי" };
  if (name.length > 60) return { ok: false, error: "שם ארוך מדי" };

  const baseSlug = slugify(name) || "workspace";
  // Try a few slug variations to avoid collision
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      await createWorkspaceForUser({ userId: user.id, name, slug });
      redirect("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // duplicate slug? retry. otherwise bail.
      if (!msg.includes("workspaces_slug")) {
        if (msg.includes("NEXT_REDIRECT")) throw err; // Next.js redirect
        return { ok: false, error: msg };
      }
    }
  }
  return { ok: false, error: "לא הצלחנו ליצור slug ייחודי" };
}
