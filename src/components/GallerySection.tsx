import Image from "next/image";

const shots = [
  { src: "/images/hero-mysuru.png", alt: "Chamundi Hills view", span: "md:col-span-2 md:row-span-2" },
  { src: "/images/room-deluxe.jpg", alt: "Premium Deluxe room", span: "" },
  { src: "/images/room-suite.jpg", alt: "3 BHK suite", span: "" },
];

export function GallerySection() {
  return (
    <section
      id="gallery"
      className="bg-[var(--dd-green)] px-6 py-24 md:px-10 lg:px-14"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
          Gallery
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--dd-cream)] md:text-5xl">
          Frames from the stay
        </h2>
        <div className="mt-12 grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[240px]">
          {shots.map((s) => (
            <div
              key={s.src + s.alt}
              className={`relative overflow-hidden ${s.span}`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                className="object-cover transition duration-700 hover:scale-105"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
