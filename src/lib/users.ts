// src/lib/users.ts
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureDemoUser } from "./demo-seed";
import { randomSuffix, slugify } from "./slug";

type GithubProfile = {
  githubId: string;
  name: string;
  email: string | null;
  image: string | null;
};

/**
 * Creates or updates the user for a GitHub login.
 * A brand new user also gets a personal workspace, so the dashboard is never empty-handed.
 */
export async function upsertGithubUser(profile: GithubProfile): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: eq(schema.users.githubId, profile.githubId),
    });

    if (existing) {
      await tx
        .update(schema.users)
        .set({ name: profile.name, email: profile.email, image: profile.image })
        .where(eq(schema.users.id, existing.id));
      return existing.id;
    }

    const [user] = await tx
      .insert(schema.users)
      .values({
        githubId: profile.githubId,
        name: profile.name,
        email: profile.email,
        image: profile.image,
      })
      .returning({ id: schema.users.id });

    const firstName = profile.name.split(" ")[0] || "My";
    const [workspace] = await tx
      .insert(schema.workspaces)
      .values({
        name: `${firstName}'s workspace`,
        slug: `${slugify(firstName)}-${randomSuffix()}`,
      })
      .returning({ id: schema.workspaces.id });

    await tx.insert(schema.memberships).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    return user.id;
  });
}

/** The demo account. Creates the demo workspace on first use so a fresh deployment needs no manual seeding. */
export async function findDemoUser() {
  return ensureDemoUser(db);
}
