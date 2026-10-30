import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * Verify email+password against the repository. Repo + bcrypt are imported
 * lazily so this module stays safe to load in Edge/middleware contexts
 * (only authorize() runs this, in the Node route handler).
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) return null;
  const { getRepo } = await import("@/server/repo/index");
  const bcrypt = (await import("bcryptjs")).default;
  const user = await getRepo().getUserByEmail(parsed.data.email);
  if (!user) return null;
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}

// NOTE: AUTH_SECRET is read here at module level because Auth.js requires the
// secret at config time. This read is side-effect free (no throw, no I/O) and
// `pnpm build` is verified with an empty environment.
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
};

/** Server-side helper for pages and route handlers. Returns null when logged out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) return null;
  return { id, email };
}
