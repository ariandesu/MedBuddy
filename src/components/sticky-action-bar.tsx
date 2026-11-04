import type { ReactNode } from "react";

/** Holds a focused flow's one primary action: docked on phones, in the page flow from md. */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 bg-dock px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur-[14px] md:static md:bg-transparent md:p-0 md:backdrop-blur-none">
      {children}
    </div>
  );
}
