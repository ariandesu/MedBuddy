"use client";

import dynamicLoader from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Split the heavy client chunks (tesseract.js + pdfjs in UploadZone, recharts
// in TimelineView) out of the server AND initial client bundles. Both views
// fetch their data client-side and render skeletons first, so skipping SSR
// changes nothing visually — but cold starts skip megabytes of parse/compile.
const DocumentsView = dynamicLoader(
  () => import("@/components/views/documents-view").then((m) => m.DocumentsView),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> }
);
const TimelineView = dynamicLoader(
  () => import("@/components/views/timeline-view").then((m) => m.TimelineView),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> }
);

export function RecordsViews({ tab }: { tab: "timeline" | "documents" }) {
  return tab === "timeline" ? <TimelineView embedded /> : <DocumentsView embedded />;
}
