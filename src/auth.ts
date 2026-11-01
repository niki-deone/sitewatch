// src/auth.ts
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { findDemoUser, upsertGithubUser } from "@/lib/users";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

export const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
export const demoEnabled = process.env.DEMO_LOGIN !== "off";

const providers: Provider[] = [];

if (githubEnabled) {
  providers.push(GitHub);
}

if (demoEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      // No password: the demo account is a read-only viewer of a sample workspace.
      async authorize() {
        const demo = await findDemoUser();
        if (!demo) return null;
        return { id: demo.id, name: demo.name, email: demo.email, image: demo.image };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubId = String(profile.id ?? account.providerAccountId);
        token.uid = await upsertGithubUser({
          githubId,
          name: (profile.name as string | null) ?? (profile.login as string | undefined) ?? "GitHub user",
          email: (profile.email as string | null) ?? null,
          image: (profile.avatar_url as string | null) ?? null,
        });
      } else if (account?.provider === "demo" && user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
