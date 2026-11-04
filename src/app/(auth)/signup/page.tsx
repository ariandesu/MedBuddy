import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { PageTitle } from "@/components/page-title";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 md:pt-6">
      <PageTitle title={dict.auth.signUpTitle} back={{ href: "/login", label: `${dict.common.back}: ${dict.auth.logIn}` }} />
      <p>{dict.auth.signUpHint}</p>
      <SignupForm dict={dict} />
      <p className="rounded-2xl border bg-card p-3 text-sm">{dict.auth.privacy}</p>
    </div>
  );
}
