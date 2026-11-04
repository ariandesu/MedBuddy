"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Dictionary } from "@/lib/i18n";

/** Says what will go, then deletes the paper and its values. Only mounted while open. */
export function DeletePaperDialog({
  doc,
  dict,
  onClose,
  onDeleted,
}: {
  doc: { id: string; fileName: string };
  dict: Dictionary;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setDeleting(true);
    setFailed(false);
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" }).catch(() => null);
    setDeleting(false);
    if (res?.ok) onDeleted();
    else setFailed(true);
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.documents.deleteConfirm}</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="break-all">{doc.fileName}</strong>
            <br />
            {dict.documents.deleteConfirmDesc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && <p role="alert" className="text-sm font-medium text-destructive">{dict.common.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12" onClick={onClose}>{dict.common.cancel}</AlertDialogCancel>
          <Button variant="destructive" className="h-12" disabled={deleting} onClick={remove}>
            <Trash2 aria-hidden />
            {dict.documents.delete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
