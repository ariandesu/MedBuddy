import type { Metadata } from "next";
import { Anek_Bangla, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DemoBanners } from "@/components/demo-banners";
import { LocaleProvider } from "@/components/locale-provider";
import LegacyStorageCleanup from "@/components/legacy-storage-cleanup";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

// Headings and numbers. Latin subset too, so English mode and digits match.
const anekBangla = Anek_Bangla({
  variable: "--font-anek",
  subsets: ["bengali", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediSathi — মেডিসাথী",
  description:
    "Digitize prescriptions and lab reports, get plain-language explanations.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = await getLocaleAndDict();
  const user = await getSessionUser();
  return (
    <html
      lang={locale}
      className={`${anekBangla.variable} ${notoSansBengali.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <LegacyStorageCleanup />
          <Header locale={locale} dict={dict} user={user} />
          <DemoBanners dict={dict} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-12 md:pt-8">
            <LocaleProvider initialLocale={locale}>
              {children}
            </LocaleProvider>
          </main>
          <footer className="no-print border-t">
            <p className="mx-auto max-w-5xl px-4 py-4 text-center text-sm text-muted-foreground">
              {dict.footer.disclaimer}
            </p>
          </footer>
          <BottomNav dict={dict} user={user} />
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
