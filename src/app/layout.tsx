import type { Metadata } from "next";
import { Inter, Oxanium, Anton, Space_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
// landing faces — poster condensed + a characterful monospace
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ASCENITH RAIDZONE — Once Human custom server, weekly tournaments, sponsored prizes",
    template: "%s · ASCENITH RAIDZONE",
  },
  description:
    "ASCENITH RAIDZONE runs a custom Once Human server and weekly RaidZone tournaments, with sponsored prizes for the squads that win. Register and get on the roster.",
  openGraph: {
    title: "ASCENITH RAIDZONE",
    description:
      "A custom Once Human server, weekly RaidZone tournaments, and sponsored prizes for winning squads.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${anton.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
