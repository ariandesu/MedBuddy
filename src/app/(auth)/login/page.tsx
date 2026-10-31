import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";
import { HeartPulse } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-10">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <HeartPulse className="size-8 text-primary" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">{dict.appName}</h1>
        <p className="text-sm text-muted-foreground">{dict.tagline}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{dict.auth.loginTitle}</CardTitle>
          <CardDescription>{dict.auth.demoExplain}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm dict={dict} />
        </CardContent>
      </Card>
    </div>
  );
}
