// src/lib/slug.ts
import { randomBytes } from "node:crypto";

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

export function randomSuffix(length = 4): string {
  return randomBytes(8).toString("hex").slice(0, length);
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
