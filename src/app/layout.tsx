import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Nav from "@/components/Nav";
import SleekIntroOverlay from "@/components/SleekIntroOverlay";

export const metadata: Metadata = {
  title: "Valorant 2v2 Skirmish",
  description:
    "Register for the community 2v2 TDM skirmish. Solo sign-up, rank-balanced teams, double-elimination bracket.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <SleekIntroOverlay />
        <div className="site-atmosphere" aria-hidden="true" />
        <Nav />
        <main className="site-main mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
        <footer className="site-footer mt-14 border-t border-val-navy-light/60 px-4 py-7 text-xs text-val-muted">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="heading text-[10px] text-val-light/80">
              Community 2v2 TDM Skirmish
            </p>
            <p className="text-center text-val-muted/60">
              Not affiliated with or endorsed by Riot Games. ·{" "}
              <Link href="/admin" className="transition-colors hover:text-val-teal">
                Organizer
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
