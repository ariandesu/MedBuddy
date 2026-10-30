import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/documents",
  "/checkin",
  "/timeline",
  "/summary",
  "/ask",
  "/report",
];
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  ) ||
  (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/"));

function hasSession(req: Request): boolean {
  const cookie = req.headers.get("cookie") || "";
  return cookie
    .split(";")
    .some((part) => {
      const name = part.trim().split("=")[0].toLowerCase();
      return (
        name === "next-auth.session-token" ||
        name === "__secure-next-auth.session-token"
      );
    });
}

export default function middleware(req: Request) {
  const { pathname } = new URL(req.url);
  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (hasSession(req)) return NextResponse.next();
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard",
    "/documents",
    "/checkin",
    "/timeline",
    "/summary",
    "/ask",
    "/report",
    "/dashboard/:path*",
    "/documents/:path*",
    "/checkin/:path*",
    "/timeline/:path*",
    "/summary/:path*",
    "/ask/:path*",
    "/report/:path*",
    "/api/((?!auth).*)",
  ],
};
