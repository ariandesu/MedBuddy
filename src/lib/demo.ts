// Client-safe demo credentials (also shown as hint text on the login page).
export const DEMO_EMAIL = "demo@medisathi.app";
export const DEMO_PASSWORD = "demo1234";

/** Private demo accounts are deleted after this long; their sessions end with them. */
export const DEMO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Matches only the addresses /api/demo/start generates. Sign-up can't create these. */
export const DEMO_ACCOUNT_EMAIL = /^demo-[0-9a-f]{8}@medisathi\.app$/;

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  return !!email && DEMO_ACCOUNT_EMAIL.test(email);
}
