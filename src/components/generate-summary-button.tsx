"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Dictionary } from "@/lib/i18n";

export function GenerateSummaryButton({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    setSaving(true);
    try {
      const res = await fetch("/api/summaries/generate", { method: "POST" });
      if (!res.ok) throw new Error(dict.common.error);
      await res.json();
      toast.success("Summary generated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={saving}
      className="w-full min-h-[44px]"
    >
      {saving ? dict.common.loading : dict.summary.generate}
    </Button>
  );
}
