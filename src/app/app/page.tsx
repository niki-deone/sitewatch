// src/app/app/page.tsx
import { redirect } from "next/navigation";
import { listUserWorkspaces, requireUser } from "@/lib/dal";

export default async function AppIndex() {
  const user = await requireUser();
  const workspaces = await listUserWorkspaces(user.id);
  if (workspaces.length > 0) redirect(`/app/${workspaces[0].slug}`);
  redirect("/app/new");
}
