"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDictionary } from "@/lib/use-dictionary";
import { cn } from "@/lib/utils";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const dict = useDictionary();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border bg-card-lead p-4">
      <h1 className="flex items-center gap-2 font-heading text-xl font-semibold">
        <TriangleAlert className="size-5 shrink-0 text-warning-foreground" aria-hidden />
        {dict.common.error}
      </h1>
      <Button className="h-14 w-full text-lg font-semibold" onClick={reset}>{dict.common.retry}</Button>
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "secondary" }), "h-14 w-full text-lg font-semibold")}>
        {dict.nav.dashboard}
      </Link>
    </div>
  );
}
