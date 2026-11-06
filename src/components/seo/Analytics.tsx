"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { GA_ID, PRIVATE_PATHS } from "@/lib/analytics";

/**
 * Loads GA4 on public pages only. Page URLs are sent without the query
 * string, so a stray ?email= can never reach Google.
 */
export function Analytics() {
  const pathname = usePathname() || "/";
  if (!GA_ID || PRIVATE_PATHS.test(pathname)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{page_location:location.origin+location.pathname,anonymize_ip:true});`}
      </Script>
    </>
  );
}
