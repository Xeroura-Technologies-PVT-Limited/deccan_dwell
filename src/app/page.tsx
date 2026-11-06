import { HeroPortal } from "@/components/HeroPortal";
import { IntroSplash } from "@/components/IntroSplash";
import { RoomsSection } from "@/components/RoomsSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { GallerySection } from "@/components/GallerySection";
import { BookingSection } from "@/components/BookingSection";
import { ContactSection, SiteFooter } from "@/components/ContactSection";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { WelcomeSection } from "@/components/site/WelcomeSection";
import { MysuruSection } from "@/components/site/MysuruSection";
import { Cursor } from "@/components/site/Cursor";
import { Marquee } from "@/components/site/Marquee";
import { HotelJsonLd } from "@/components/seo/HotelJsonLd";

export default function Home() {
  return (
    <>
      {/* The logo intro belongs to the homepage only — never the booking,
          receipt, sign-in or admin pages. */}
      <IntroSplash />
      <SmoothScroll />
      <Cursor />
      <SiteHeader />
      <HotelJsonLd />
      <main>
        <h1 className="sr-only">Deccan Dwell — rooms and family suites near Chamundi Hills, Mysuru</h1>
        <HeroPortal />
        <WelcomeSection />
        <RoomsSection />
        <ExperienceSection />
        <section aria-hidden className="dd-night border-y border-[var(--dd-line-dark)] py-[clamp(28px,4vw,56px)]">
          <Marquee
            items={["Mysuru", "Chamundi Hills", "A home away from home", "Deccan Dwell"]}
            className="text-[var(--dd-cream)]"
          />
        </section>
        <MysuruSection />
        <GallerySection />
        <BookingSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
