import {
  LayoutDashboard,
  FileText,
  Files,
  ClipboardCheck,
  ChartLine,
  MessageCircleQuestion,
  Printer,
  Activity,
} from "lucide-react";

export type NavItem = {
  href: string;
  key: string;
  Icon: typeof LayoutDashboard;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/records", key: "records", Icon: FileText },
  { href: "/documents", key: "documents", Icon: Files },
  { href: "/checkin", key: "checkin", Icon: ClipboardCheck },
  { href: "/timeline", key: "timeline", Icon: ChartLine },
  { href: "/show-doctor", key: "showDoctor", Icon: Activity },
  { href: "/ask", key: "ask", Icon: MessageCircleQuestion },
  { href: "/summary", key: "summary", Icon: FileText },
  { href: "/report", key: "report", Icon: Printer },
];

export const MORE_ITEMS = NAV_ITEMS.filter(
  (i) =>
    i.key === "records" ||
    i.key === "summary" ||
    i.key === "report" ||
    i.key === "ask" ||
    i.key === "showDoctor"
);
