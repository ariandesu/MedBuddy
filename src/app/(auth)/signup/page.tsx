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

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-10">
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
