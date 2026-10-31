import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  ChartLine,
  MessageCircleQuestion,
  FileText,
  Printer,
} from "lucide-react";

export type NavItem = {
  href: string;
  key: string;
  Icon: typeof LayoutDashboard;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/documents", key: "documents", Icon: Files },
  { href: "/checkin", key: "checkin", Icon: ClipboardCheck },
  { href: "/timeline", key: "timeline", Icon: ChartLine },
  { href: "/ask", key: "ask", Icon: MessageCircleQuestion },
  { href: "/summary", key: "summary", Icon: FileText },
  { href: "/report", key: "report", Icon: Printer },
];

export const MORE_ITEMS = NAV_ITEMS.filter(
  (i) => i.key === "summary" || i.key === "report" || i.key === "ask"
);
