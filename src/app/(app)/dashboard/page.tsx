import Link from "next/link";
import { Upload, ClipboardCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLocaleAndDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.dashboard.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard.welcome}</CardTitle>
          <CardDescription>{dict.dashboard.empty}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link href="/documents" className={buttonVariants({})}>
            <Upload aria-hidden />
            {dict.dashboard.uploadCta}
          </Link>
          <Link
            href="/checkin"
            className={buttonVariants({ variant: "secondary" })}
          >
            <ClipboardCheck aria-hidden />
            {dict.dashboard.checkinCta}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
