import type { Metadata } from "next";
import { Anek_Bangla, Anek_Latin, Noto_Sans_Bengali } from "next/font/google";
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

// Latin text, in headings and body, so English matches the Bangla headings.
const anekLatin = Anek_Latin({
  variable: "--font-anek-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Bangla headings and numbers.
const anekBangla = Anek_Bangla({
  variable: "--font-anek",
  subsets: ["bengali"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto",
  subsets: ["bengali"],
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
      className={`${anekLatin.variable} ${anekBangla.variable} ${notoSansBengali.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <LegacyStorageCleanup />
          <Header locale={locale} dict={dict} user={user} />
          <DemoBanners dict={dict} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-6 pt-4 md:pb-12 md:pt-8">
            <LocaleProvider initialLocale={locale}>
              {children}
            </LocaleProvider>
          </main>
          <footer className={`no-print border-t ${user ? "pb-28 md:pb-0" : ""}`}>
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
