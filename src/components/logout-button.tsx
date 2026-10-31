"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/** Icon-only on small screens (label stays available to screen readers), text from lg. */
export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      aria-label={label}
      title={label}
      className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:px-3"
    >
      <LogOut className="size-5" aria-hidden />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
