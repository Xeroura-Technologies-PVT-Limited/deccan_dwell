import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Great_Vibes, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { IntroSplash } from "@/components/IntroSplash";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const nav = DM_Sans({
  variable: "--font-nav",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const script = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Deccan Dwell · Mysuru",
  description:
    "Premium stays at the foothills of Chamundi Hills — home away from home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", display.variable, nav.variable, body.variable, script.variable, "font-sans", geist.variable)}
    >
      <head>
        <link rel="preload" as="image" href="/images/logo.png" />
      </head>
      <body className="min-h-full">
        <IntroSplash />
        {children}
      </body>
    </html>
  );
}
