"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reads text aloud in the page's language, for people who find reading hard. */
export function ReadAloud({ text, label }: { text: string; label: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="size-12 shrink-0"
      aria-label={label}
      title={label}
      onClick={() => {
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = (document.documentElement.lang || "bn").startsWith("bn") ? "bn-BD" : "en-US";
          speechSynthesis.speak(u);
        } catch {
          // No speech on this browser: the text is still on screen.
        }
      }}
    >
      <Volume2 className="size-5!" aria-hidden />
    </Button>
  );
}
