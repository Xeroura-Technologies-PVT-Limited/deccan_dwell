import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Great_Vibes, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
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
    "Rooms and three-bedroom suites at the foothills of Chamundi Hills, Mysuru — a home away from home.",
};

/**
 * Runs before first paint. The intro plays on every full load of the home
 * page; it is skipped on other pages and with `?intro=0`.
 */
const INTRO_GATE = `(function(){try{var d=document.documentElement,l=location;if(l.pathname!=="/"){d.classList.add("dd-no-intro","dd-entered")}else if(/[?&]intro=0(?:&|$)/.test(l.search)){d.classList.add("dd-no-intro")}d.style.setProperty("--dd-hero-h",innerHeight+"px")}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", display.variable, nav.variable, body.variable, script.variable, "font-sans", geist.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <noscript>
          <style>{".dd-enter{opacity:1!important;transform:none!important}.dd-intro{display:none}"}</style>
        </noscript>
        <link rel="preload" as="image" href="/images/logo.png" />
      </head>
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
