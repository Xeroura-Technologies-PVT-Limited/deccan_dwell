import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Great_Vibes, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { Analytics } from "@/components/seo/Analytics";

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
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · Deccan Dwell" },
  description: SITE_DESCRIPTION,
  applicationName: "Deccan Dwell",
  keywords: [
    "Deccan Dwell",
    "hotel in Mysuru",
    "stay near Chamundi Hills",
    "homestay Mysore",
    "rooms near Mysore Palace",
    "family suite Mysuru",
    "3 BHK stay Mysore",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Deccan Dwell",
    url: "/",
    locale: "en_IN",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Deccan Dwell, Mysuru — a home away from home" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: true, address: true, email: true },
  other: { "geo.region": "IN-KA", "geo.placename": "Mysuru" },
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
        <Analytics />
      </body>
    </html>
  );
}
