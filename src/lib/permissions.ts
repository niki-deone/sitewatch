// src/lib/permissions.ts
import type { Role } from "@/db/schema";

export type Action =
  | "monitor:write"
  | "monitor:run"
  | "workspace:settings"
  | "workspace:members"
  | "workspace:delete";

const matrix: Record<Action, readonly Role[]> = {
  "monitor:write": ["owner", "admin", "member"],
  "monitor:run": ["owner", "admin", "member"],
  "workspace:settings": ["owner", "admin"],
  "workspace:members": ["owner", "admin"],
  "workspace:delete": ["owner"],
};

export function can(role: Role, action: Action): boolean {
  return matrix[action].includes(role);
}

export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};
