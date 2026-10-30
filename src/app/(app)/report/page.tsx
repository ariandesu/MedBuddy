import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.report.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{dict.report.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">M1 placeholder — M8 adds print layout.</p>
        </CardContent>
      </Card>
    </div>
  );
}
