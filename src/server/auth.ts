import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { DEMO_EMAIL, DEMO_RETENTION_MS, isDemoAccountEmail } from "@/lib/demo";

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
  if (!user) {
    // Same work as a real check, so response time doesn't reveal which emails exist.
    await bcrypt.hash(parsed.data.password, 10);
    return null;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}

// Login attempts per hour. High enough for shared venue Wi-Fi (each demo start is
// a login). The email is hashed so the rate-limit store holds no addresses.
const LOGIN_PER_IP = 100;
const LOGIN_PER_EMAIL = 30;

export async function loginAllowed(email: string, ip: string): Promise<boolean> {
  const { rateLimitCheck } = await import("@/server/rate-limit");
  const { createHash } = await import("node:crypto");
  const normalized = email.trim().toLowerCase();
  const emailKey = createHash("sha256").update(normalized).digest("hex");
  const checks = await Promise.all([
    rateLimitCheck(`ip:${ip}`, "login", LOGIN_PER_IP),
    // Without a database every visitor shares the one demo login, whose password is public.
    ...(normalized === DEMO_EMAIL
      ? []
      : [rateLimitCheck(`email:${emailKey}`, "login", LOGIN_PER_EMAIL)]),
  ]);
  return checks.every((c) => c.allowed);
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const { clientIp } = await import("@/server/rate-limit");
        const ip = clientIp({ headers: new Headers(req?.headers as Record<string, string> | undefined) });
        // Over the limit looks like any failed login.
        if (!(await loginAllowed(credentials.email, ip))) return null;
        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        if (isDemoAccountEmail(user.email)) token.demoExpiresAt = Date.now() + DEMO_RETENTION_MS;
      }
      return token;
    },
    async session({ session, token }) {
      // A demo session ends when its account is due for deletion: without an id,
      // getSessionUser treats it as logged out.
      const expired = typeof token.demoExpiresAt === "number" && Date.now() > token.demoExpiresAt;
      if (session.user && typeof token.id === "string" && !expired) {
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
