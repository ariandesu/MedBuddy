"use client";

import { signOut } from "next-auth/react";
import { Repeat } from "lucide-react";

export function DemoSwitchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login#profiles" })}
      className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-card px-5 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card"
    >
      <Repeat className="size-4" aria-hidden />
      {label}
    </button>
  );
}
