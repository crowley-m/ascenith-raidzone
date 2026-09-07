import type { Metadata } from "next";
import { Inter, Oxanium, Archivo } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
// landing display face — a clean, legible grotesque, used heavy
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ASCENITH RAIDZONE — Once Human custom server, weekly raids, in-game rewards",
    template: "%s · ASCENITH RAIDZONE",
  },
  description:
    "ASCENITH RAIDZONE runs a custom Once Human server and weekly raids, and splits an in-game reward pool between the raiders who show up. Enlist.",
  openGraph: {
    title: "ASCENITH RAIDZONE",
    description:
      "A custom Once Human server, weekly raids, and in-game rewards for every raider.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${archivo.variable}`}
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
