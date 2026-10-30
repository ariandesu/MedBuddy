import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DemoBanners } from "@/components/demo-banners";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${inter.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col"
        style={{
          fontFamily:
            "var(--font-inter), var(--font-hind), system-ui, sans-serif",
        }}
      >
        <TooltipProvider>
          <Header locale={locale} dict={dict} user={user} />
          <DemoBanners dict={dict} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10">
            {children}
          </main>
          <footer className="no-print border-t">
            <p className="mx-auto max-w-5xl px-4 py-4 text-center text-sm text-muted-foreground">
              {dict.footer.disclaimer}
            </p>
          </footer>
          <BottomNav dict={dict} />
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
