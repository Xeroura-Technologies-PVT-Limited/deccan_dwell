import { HeroPortal } from "@/components/HeroPortal";
import { RoomsSection } from "@/components/RoomsSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { GallerySection } from "@/components/GallerySection";
import { BookingSection } from "@/components/BookingSection";
import { ContactSection, SiteFooter } from "@/components/ContactSection";

export default function Home() {
  return (
    <main>
      <HeroPortal />
      <RoomsSection />
      <ExperienceSection />
      <GallerySection />
      <BookingSection />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
