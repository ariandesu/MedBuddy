import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PageTitle } from "@/components/page-title";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";
import { isDemoDataMode } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { dict, locale } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 md:pt-6">
      <PageTitle title={dict.auth.loginTitle} />
      <LoginForm dict={dict} locale={locale} profiles={!isDemoDataMode()} />
    </div>
  );
}
