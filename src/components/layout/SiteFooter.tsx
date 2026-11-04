import { PhotoSlideshow } from "@/components/ui/PhotoSlideshow";
import { sortedPhotos } from "@/lib/photos";

const FOOTER_PHOTOS = import.meta.glob("../../assets/gala/footer/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const FOOTER_SLIDES = sortedPhotos(FOOTER_PHOTOS, "/images/lounge-footer.jpg");

const ORGANISER_LOGOS = import.meta.glob("../../assets/logos/*.{png,jpg,jpeg,svg,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function organiserLogo(slug: string): string | undefined {
  const key = slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const hit = Object.entries(ORGANISER_LOGOS).find(([path]) => {
    const file = (path.split("/").pop() ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    return file.includes(key);
  });
  return hit?.[1];
}

const LOGO_SLOTS = [
  { slug: "nexa", label: "NEXA", imgClass: "h-16 w-auto object-contain" },
  { slug: "commercial-nominees", label: "Commercial Nominees", imgClass: "h-20 w-auto object-contain" },
  { slug: "paparazzi", label: "Paparazzi", imgClass: "h-16 w-auto object-contain" },
];

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-line">
      <div className="w-full px-5 pt-10">
        <div className="relative isolate overflow-hidden border border-line bg-ink-2">
          <PhotoSlideshow
            images={FOOTER_SLIDES}
            alt="Quiet investor lounge with walnut and brass lamps"
            className="h-56 w-full sm:h-72 lg:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/25 to-transparent" />
          <div className="absolute inset-0 flex items-end p-6 sm:p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-2">The lounge</p>
              <p className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                A quieter room for the next conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-4 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl tracking-[0.08em]">ETHIOPIAN BUSINESS AND INVESTMENT FORUM</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">
            Addis Ababa , Ethiopia
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:justify-end">
          {LOGO_SLOTS.map(({ slug, label, imgClass }) => {
            const src = organiserLogo(slug);
            return (
              <div
                key={slug}
                className="flex shrink-0 items-center justify-center border border-line bg-ink/60 px-3 py-2"
              >
                {src ? (
                  <img src={src} alt={label} className={imgClass} />
                ) : (
                  <span className="text-center text-[10px] uppercase tracking-[0.14em] text-mute">
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
