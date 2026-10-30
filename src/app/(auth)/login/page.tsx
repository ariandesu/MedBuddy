import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-10">
      <Card>
        <CardHeader>
          <CardTitle>{dict.auth.loginTitle}</CardTitle>
          <CardDescription>{dict.auth.demoHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">M1 placeholder — M3 adds Auth.js login.</p>
          <Button disabled>{dict.auth.submit}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
