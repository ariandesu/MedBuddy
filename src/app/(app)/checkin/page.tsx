import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.checkin.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{dict.checkin.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">M1 placeholder — M6 adds check-in form.</p>
        </CardContent>
      </Card>
    </div>
  );
}
