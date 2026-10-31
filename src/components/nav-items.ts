import {
  House,
  FolderOpen,
  ClipboardCheck,
  MessageCircleQuestion,
  Stethoscope,
} from "lucide-react";

export type NavItem = {
  href: string;
  key: "dashboard" | "records" | "checkin" | "ask" | "showDoctor";
  Icon: typeof House;
  /** Other paths that should highlight this item. */
  match?: string[];
};

/** The five places in the app. Same set on mobile (bottom bar) and desktop (header). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", Icon: House },
  { href: "/records", key: "records", Icon: FolderOpen, match: ["/documents"] },
  { href: "/checkin", key: "checkin", Icon: ClipboardCheck },
  { href: "/ask", key: "ask", Icon: MessageCircleQuestion },
  { href: "/show-doctor", key: "showDoctor", Icon: Stethoscope },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.match ?? [])].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
