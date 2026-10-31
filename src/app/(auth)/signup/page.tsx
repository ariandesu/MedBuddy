import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/signup-form";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-10">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="size-8 text-primary" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">{dict.appName}</h1>
        <p className="text-sm text-muted-foreground">{dict.tagline}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{dict.auth.signUpTitle}</CardTitle>
          <CardDescription>{dict.auth.signUpHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm dict={dict} />
        </CardContent>
      </Card>
    </div>
  );
}
