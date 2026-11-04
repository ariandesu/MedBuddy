import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const { dict } = await getLocaleAndDict();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border bg-card-lead p-4">
      <h1 className="font-heading text-xl font-semibold">{dict.common.notFound}</h1>
      <Link href="/" className={cn(buttonVariants(), "h-14 w-full text-lg font-semibold")}>
        {dict.nav.dashboard}
      </Link>
    </div>
  );
}
