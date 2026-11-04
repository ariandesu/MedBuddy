"use client";

import { Phone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tile } from "@/components/tile";
import { urgentMessage } from "@/lib/safety/redflags";
import type { Dictionary, Locale } from "@/lib/i18n";

/** Call 999 is the largest control. The user's language comes first, the other below it. */
export function UrgentDialog({ open, dict, locale, onUnderstood }: {
  open: boolean;
  dict: Dictionary;
  locale: Locale;
  onUnderstood: () => void;
}) {
  const other: Locale = locale === "bn" ? "en" : "bn";
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onUnderstood()}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] gap-4 rounded-[2rem] p-5 text-left sm:max-w-md">
        <Tile variant="lead" className="bg-destructive text-destructive-foreground">
          <TriangleAlert className="size-8" />
        </Tile>
        <AlertDialogTitle className="font-heading text-2xl font-semibold">{dict.redflag.title}</AlertDialogTitle>
        <AlertDialogDescription render={<div className="flex flex-col gap-2 text-foreground" />}>
          <span className="block text-lg">{urgentMessage(locale)}</span>
          <span lang={other} className="block text-base text-muted-foreground">{urgentMessage(other)}</span>
        </AlertDialogDescription>
        <a
          href="tel:999"
          className="flex min-h-16 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-center text-xl font-semibold text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Phone className="size-6" aria-hidden />
          {dict.checkin.call999}
        </a>
        <Button variant="outline" className="h-14 text-lg" onClick={onUnderstood}>
          {dict.checkin.iUnderstand}
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
