import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{dict.documents.title}</h1>
        <Button>
          <Upload aria-hidden />
          {dict.documents.upload}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{dict.documents.title}</CardTitle>
          <CardDescription>{dict.documents.empty}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">M1 placeholder — M4 adds upload + OCR.</p>
        </CardContent>
      </Card>
    </div>
  );
}
