import type { Metadata } from "next";
import { Inter, Oxanium } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ASCENITH RAIDZONE — Once Human custom servers, events & rewards",
    template: "%s · ASCENITH RAIDZONE",
  },
  description:
    "ASCENITH RAIDZONE runs custom Once Human servers, community events, and hands out real rewards to players. Register, build your profile, and join the raids.",
  openGraph: {
    title: "ASCENITH RAIDZONE",
    description:
      "Custom Once Human servers, community events, and real rewards for players.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">
        <SiteHeader />
        <main className="min-h-[70vh]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
