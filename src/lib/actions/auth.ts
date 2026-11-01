// src/lib/actions/auth.ts
"use server";

import { signIn, signOut } from "@/auth";

function safeCallback(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  // Only allow same-site relative paths to avoid open redirects.
  return path.startsWith("/") && !path.startsWith("//") ? path : "/app";
}

export async function signInWithGithub(formData: FormData) {
  await signIn("github", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function signInAsDemo() {
  await signIn("demo", { redirectTo: "/app" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
