import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUp,
  Menu,
  X,
  Gem,
  Handshake,
  Landmark,
  Mic2,
  Radio,
  Users,
} from "lucide-react";

const NAV = [
  { href: "#gathering", label: "About" },
  { href: "#programme", label: "Programme" },
  { href: "#rooms", label: "Who attends" },
  { href: "#join", label: "Join" },
  { href: "#organisers", label: "Organisers" },
  { href: "#register", label: "Register" },
];

const PILLARS = [
  {
    icon: Landmark,
    title: "Capital, not theatre",
    copy: "Investor sessions and a structured company hour — built for decisions, not applause.",
  },
  {
    icon: Handshake,
    title: "Matchmaking with a desk",
    copy: "Pre-arranged conversations between investors, founders and institutions, not chance encounters in a corridor.",
  },
  {
    icon: Users,
    title: "A room that holds protocol",
    copy: "Government, embassy and institutional guests hosted with the formality the occasion requires.",
  },
  {
    icon: Mic2,
    title: "A dinner that closes the day",
    copy: "A seated dinner after the working programme — relationship, not residual entertainment.",
  },
];

const DAYS = [
  {
    day: "Day 1",
    title: "CONNECT & DISCOVER",
    items: [
      ["Morning", "Opening and institutional address"],
      ["Midday", "Investment panels and sector briefings"],
      ["Afternoon", "Company hour and exhibition floor"],
      ["Late", "Curated investor introductions"],
    ],
  },
  {
    day: "Day 2",
    title: "DEVELOP, DEAL & CELEBRATE",
    items: [
      ["Morning", "Matchmaking sessions and follow-through"],
      ["Afternoon", "Partnership conversations"],
      ["Evening", "Closing dinner, seated, with programme"],
    ],
  },
];

const ROOMS = [
  {
    kicker: "Capital",
    title: "Investors",
    copy: "Funds, family offices and principals looking for a filtered set of companies — not an open trade floor.",
  },
  {
    kicker: "Enterprise",
    title: "Founders",
    copy: "Companies ready to present with discipline: a room, a slot, and a follow-up that is actually scheduled.",
  },
  {
    kicker: "Institution",
    title: "Public & diplomatic",
    copy: "Ministries, development partners and embassies. Protocol is part of the design, not an afterthought.",
  },
  {
    kicker: "Floor",
    title: "Exhibitors",
    copy: "A limited shell-scheme marketplace. Presence is sold against confirmed participation, not speculation.",
  },
];

const ATTENDEES = [
  "Investors and family offices",
  "Founders and company principals",
  "Banks and development finance",
  "Ministries and public institutions",
  "Embassies and diplomatic missions",
  "Sponsors and corporate partners",
  "Exhibitors",
  "Media",
];

const JOIN = [
  {
    title: "Register to attend",
    copy: "Investors, founders and institutional guests. Registration is not a confirmed seat.",
    href: "#register",
    label: "Register",
  },
  {
    title: "Book a presence",
    copy: "A limited exhibition floor and three partnership levels. Briefs follow the venue hold.",
    href: "#partners",
    label: "See partnership",
  },
  {
    title: "Press day",
    copy: "Television crews and radio reporters are invited on the release date. A listing is not an endorsement.",
    href: "#press",
    label: "Media list",
  },
];

const EVENT_TARGETS = [
  { value: "500+", label: "Invited participants" },
  { value: "150+", label: "Structured B2B connections" },
  { value: "50+", label: "Business and investment opportunities showcased" },
  { value: "6B+ USD", label: "Identified opportunity pipeline" },
  {
    value: "40+",
    label: "International investors and equity financiers expected from abroad",
  },
  { value: "8+", label: "Active embassies and diplomatic missions" },
];

const EVENT_TARGET_META = EVENT_TARGETS.map(({ value }) => {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  return {
    target: Number(match?.[1] ?? 0),
    suffix: match?.[2] ?? value,
  };
});

function useEventTargetCounts() {
  const [counts, setCounts] = useState(() => EVENT_TARGET_META.map(() => 0));

  useEffect(() => {
    const duration = 1600;
    const startedAt = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setCounts(EVENT_TARGET_META.map(({ target }) => Math.round(target * easedProgress)));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return counts;
}

const TIERS = [
  {
    name: "Patron",
    note: "Naming presence",
    points: ["Stage and dinner acknowledgement", "Principal dinner table", "Private briefing before the room opens"],
  },
  {
    name: "Partner",
    note: "Working presence",
    points: ["Exhibition position", "Session or lounge association", "Brand wall and programme listing"],
  },
  {
    name: "Associate",
    note: "Room presence",
    points: ["Programme credit", "Networking access", "Invitation allocation for guests"],
  },
];

const MEDIA = ["ETV", "Fana", "EBS", "Arts & Abay", "Sheger", "Ethio FM", "Bisrat FM"];

type PassOption = {
  id: string;
  name: string;
  detail: string;
  amount: number | null;
  vat?: boolean;
  priceLabel?: string;
  email?: string;
};

const PROPOSAL_EMAIL = "events@nexabusinessgroup.com";

const PASSES: PassOption[] = [
  { id: "delegate", name: "Exhibition Presence", detail: "Booth and two participants passes", amount: 485_000, vat: true },
  { id: "investor", name: "Exhibition Presentation", detail: "Exhibition Booth, Company Hour and two participant passes", amount: 596_000, vat: true },
  { id: "gala", name: "FULL PARTICIPATION PACKAGE", detail: "Exhibition Booth, Company Hour, Premium Networking Access, two closing dinner seats, Digital Spotlight Package and two participant passes", amount: 1_056_000, vat: true },
  { id: "shell", name: "REQUEST A SPONSORSHIP PROPOSAL", detail: PROPOSAL_EMAIL, amount: null, priceLabel: "Upon Request", email: PROPOSAL_EMAIL },
];

function passPrice(item: PassOption): string {
  if (item.amount === null) return item.priceLabel ?? "Upon Request";
  return item.amount.toLocaleString("en-ET");
}

function passPriceWithCurrency(item: PassOption): string {
  if (item.amount === null) return passPrice(item);
  return item.vat ? `${passPrice(item)} ETB + VAT` : `${passPrice(item)} ETB`;
}

const METHODS = ["Telebirr", "CBE Birr", "Bank transfer", "Card"];

const ORGANISER_PHOTOS = import.meta.glob("../../assets/organisers/**/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const PROGRAMME_PHOTOS = import.meta.glob("../../assets/gala/programme/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const WHO_ATTENDS_PHOTOS = import.meta.glob("../../assets/gala/who-attends/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const FOOTER_PHOTOS = import.meta.glob("../../assets/gala/footer/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function sortedPhotos(photos: Record<string, string>, fallback: string): string[] {
  const images = Object.entries(photos)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url);
  return images.length > 0 ? images : [fallback];
}

const PROGRAMME_SLIDES = sortedPhotos(PROGRAMME_PHOTOS, "/images/stage.jpg");
const WHO_ATTENDS_SLIDES = sortedPhotos(WHO_ATTENDS_PHOTOS, "/images/lounge.jpg");
const FOOTER_SLIDES = sortedPhotos(FOOTER_PHOTOS, "/images/lounge-footer.jpg");

function organiserPhotos(slug: string): string[] {
  const marker = `/organisers/${slug}/`;
  return Object.entries(ORGANISER_PHOTOS)
    .filter(([path]) => path.includes(marker))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url);
}

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

const ORGANISERS = [
  {
    name: "NEXA",
    copy: "Running order, sponsorship, matchmaking and the protocol between investors, founders and institutions.",
    images: organiserPhotos("nexa"),
    link: "https://www.nexabusinessgroup.com",
  },
  {
    name: "Commercial Nominees",
    copy: "represents established corporate and institutional weights ,making it ideal to highlight structured enterprise administration, state-backed networks, or logistics.",
    images: organiserPhotos("commercial-nominees"),
    link: "https://www.commercialnominees.com",
  },
  {
    name: "Paparazzi",
    copy: "Press desk, photography, film and the invitation list for television, radio and social news pages.",
    images: organiserPhotos("paparazzi"),
  },
];

const SLIDE_MS = 3500;

const ROLES = ["Investor", "Founder", "Institution", "Sponsor", "Media", "Speaker"];

type Interest = {
  name: string;
  organisation: string;
  email: string;
  role: string;
  note: string;
};

const EMPTY: Interest = { name: "", organisation: "", email: "", role: "Investor", note: "" };
  const LEGACY_INTEREST_KEY = "nexa-forum-interest";
  const PAY_KEY = "nexa-forum-payment";

function OrganiserCard({
  name,
  copy,
  images,
  link,
}: {
  name: string;
  copy: string;
  images: string[];
  link?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  return (
    <article className="border border-line bg-ink">
      <div className="relative aspect-square w-full overflow-hidden bg-ink-2">
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${name} – photo ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ))}
        {images.length > 1 && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Show photo ${i + 1} of ${name}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent p-4 pt-10">
          <h3 className="mt-1 font-display text-3xl">{name}</h3>
        </div>
      </div>
      <p className="p-5 text-sm text-mute">{copy}</p>
      {link && (
        <div className="px-5 pb-5">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gold underline underline-offset-4 hover:text-gold-2"
          >
            {link.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}
    </article>
  );
}

function PhotoSlideshow({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((src, imageIndex) => (
        <img
          key={src}
          src={src}
          alt={imageIndex === 0 ? alt : ""}
          aria-hidden={imageIndex === 0 ? undefined : true}
          loading={imageIndex === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out"
          style={{
            opacity: imageIndex === index ? 1 : 0,
            objectPosition: src.toLowerCase().includes("founder") ? "right center" : "center",
          }}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {images.map((src, imageIndex) => (
            <button
              key={src}
              type="button"
              aria-label={`Show slide ${imageIndex + 1}`}
              onClick={() => setIndex(imageIndex)}
              className={`h-1.5 rounded-full transition-all ${
                imageIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const GALA_DATE = new Date("2026-11-28T00:00:00");

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) return null;

  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  return {
    days: Math.floor(totalSeconds / (60 * 60 * 24)),
    hours: Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60)),
    minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
    seconds: totalSeconds % 60,
  };
}

function Countdown({ className = "" }: { className?: string }) {
  const t = useCountdown(GALA_DATE);
  const cells = [
    { label: "Days", value: t?.days },
    { label: "Hours", value: t?.hours },
    { label: "Mins", value: t?.minutes },
    { label: "Secs", value: t?.seconds },
  ];

  return (
    <div className={`inline-flex items-stretch gap-2 ${className}`} aria-label="Countdown to 28 November">
      {cells.map(({ label, value }) => (
        <div
          key={label}
          className="flex min-w-[3.75rem] flex-col items-center justify-center bg-gold px-3 py-1.5"
        >
          <span className="font-display text-2xl leading-none text-ink tabular-nums">
            {value === undefined ? "--" : String(value).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink/80">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GalaSite() {
  const eventTargetCounts = useEventTargetCounts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Interest>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [payMethod, setPayMethod] = useState(METHODS[0]);
  const [passId, setPassId] = useState(PASSES[0].id);
  const [payer, setPayer] = useState({ name: "", organisation: "", email: "", phone: "" });
  const [receipt, setReceipt] = useState("");
  const [payError, setPayError] = useState("");
  const pass = PASSES.find((item) => item.id === passId) ?? PASSES[0];

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_INTEREST_KEY);
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes("@") || !form.organisation.trim()) {
      setError("Name, organisation and a valid email are required.");
      setSaved(false);
      return;
    }
    setError("");
    setSaved(true);
  }

  function updateRegistration(changes: Partial<Interest>) {
    setForm((current) => ({ ...current, ...changes }));
    setSaved(false);
    setError("");
  }

  function pay(e: FormEvent) {
    e.preventDefault();
    if (!payer.name.trim() || !payer.email.includes("@") || payer.phone.trim().length < 9) {
      setPayError("Name, a valid email and a phone number are required.");
      setReceipt("");
      return;
    }
    const reference = `NX-${Date.now().toString().slice(-8)}`;
    const order = {
      reference,
      pass: pass.name,
      amount: pass.amount,
      amountLabel: passPriceWithCurrency(pass),
      method: payMethod,
      payer,
      status: "awaiting-gateway",
    };
    try {
      localStorage.setItem(PAY_KEY, JSON.stringify(order));
    } catch {
      /* storage unavailable in this context; the order is still shown below */
    }
    setPayError("");
    setReceipt(reference);
  }

  return (
    <div className="w-full min-h-screen bg-paper text-cream">
      <header className="w-full sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="w-full flex h-16 items-center justify-between px-5">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/images/LOGO.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-full border border-line bg-white object-cover"
            />
<span className="whitespace-nowrap font-display text-[clamp(0.72rem,3.5vw,1.25rem)] tracking-[0.04em]">
               ETHIOPIAN BUSINESS AND INVESTMENT FORUM
             </span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[12px] uppercase tracking-[0.18em] text-mute transition-colors hover:text-cream"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#pay"
              className="border border-gold bg-gold px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-2"
            >
              Pay now
            </a>
          </nav>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center border border-line md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line bg-ink px-5 py-4 md:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm uppercase tracking-[0.16em] text-cream"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top" className="w-full">
        <section className="w-full relative isolate min-h-[88vh] overflow-hidden">
         <video
  autoPlay
  muted
  loop
  playsInline
  className="absolute inset-0 h-full w-full object-cover"
>
  <source src="/images/EventVid1.mp4" type="video/mp4" />
</video>
          <div className="absolute inset-0 bg-shade/55" />
          <div className="relative w-full flex min-h-[88vh] flex-col justify-end px-5 pb-16 pt-28">
            <p className="text-[12px] uppercase tracking-[0.32em] text-ink">
               Addis Ababa · Two days + closing dinner · 2026
            </p>
            <div className="mt-5 inline-flex w-fit self-start items-center gap-3 border border-ink/60 bg-ink/15 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-ink backdrop-blur-sm">
              <span className="text-ink">NOVEMBER 28 - 29</span>
              <span className="h-3 w-px bg-ink/60" aria-hidden="true" />
              <span>2026</span>
            </div>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] font-medium text-ink sm:text-7xl">
               Ethiopian Business
               <span className="block italic">& Investment Forum</span>
             </h1>
             <p className="mt-6 text-base text-ink">
              A premier business and investment platform bringing together companies, investors, government institutions and
               international partners for meaningful connections, opportunity discovery and commercial collaboration.
             </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#pay"
                className="inline-flex h-12 items-center gap-2 bg-gold px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-ink"
              >
                Pay for a pass <ArrowRight size={16} />
              </a>
              <a
                href="#join"
                className="inline-flex h-12 items-center border border-ink px-5 text-[12px] uppercase tracking-[0.18em] text-ink"
              >
                Book a presence
              </a>
            </div>
            <Countdown className="mt-4" />
          </div>
        </section>

        <section className="border-y border-line bg-ink-2">
          <div className="w-full grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            {[
              ["Two days", "Working programme"],
              ["One dinner", "Closing dinner"],
              ["Matchmaking", "Scheduled, not chance"],
              ["Exhibition", "Limited floor"],
            ].map(([k, v]) => (
              <div key={k} className="px-5 py-6">
                <p className="font-display text-2xl text-gold-2">{k}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{v}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="event-targets-heading" className="border-b border-line bg-ink">
          <div className="w-full px-5 py-12">
            <h2
              id="event-targets-heading"
              className="mb-6 text-[12px] font-medium uppercase tracking-[0.28em] text-gold"
            >
              Event targets
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {EVENT_TARGETS.map(({ value, label }, index) => (
                <div key={value}>
                  <p className="font-display text-3xl font-semibold leading-none text-gold-2 sm:text-4xl">
                    {eventTargetCounts[index].toLocaleString("en-US")}
                    {EVENT_TARGET_META[index].suffix}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-mute">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="join" className="w-full px-5 py-16">
          <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Join</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Three ways into the room.</h2>
          <div className="mt-8 grid gap-px bg-line md:grid-cols-3">
            {JOIN.map((item) => (
              <article key={item.title} className="flex flex-col bg-ink p-6">
                <h3 className="font-display text-3xl">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm text-mute">{item.copy}</p>
                <a
                  href={item.href}
                  className="group mt-6 inline-flex h-11 items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-gold transition-colors duration-300 hover:text-gold-2"
                >
                  <span className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">{item.label}</span>
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 ease-out group-hover:translate-x-1.5"
                  />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="gathering" className="border-t border-line">
          <div className="w-full grid gap-12 px-5 py-20 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-[12px] uppercase tracking-[0.28em] text-gold">About</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Where business leadership, investment and opportunity come together.
              </h2>
              <p className="mt-5 text-mute">
              The Ethiopian Business & Investment Forum 2026 is a two-day business and investment platform designed to strengthen connections between Ethiopian enterprises, international investors, government institutions and strategic partners. The programme combines executive dialogue with practical commercial engagement, creating space for companies to present capabilities, investors to explore opportunities and institutions to build productive relationships.
               </p>
            </div>
            <div className="grid gap-px bg-line sm:grid-cols-2 lg:col-span-7">
              {PILLARS.map((item) => (
                <article key={item.title} className="bg-ink-2 p-6">
                  <item.icon className="text-gold" size={20} strokeWidth={1.5} />
                  <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-mute">{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="programme" className="border-t border-line bg-ink-2">
          <div className="w-full grid gap-10 px-5 py-20 lg:grid-cols-2">
            <div>
              <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Programme</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Two working days. One formal close.</h2>
              <p className="mt-4 text-mute">
                The running order is still being locked with the venue. What will not change is the shape: work first, dinner last.
              </p>
              <PhotoSlideshow
                images={PROGRAMME_SLIDES}
                alt="Dark stage with a single gold line of light"
                className="mt-8 aspect-[3/2] w-full"
              />
            </div>
            <div className="space-y-10">
              {DAYS.map((block) => (
                <div key={block.day}>
                  <p className="text-[12px] uppercase tracking-[0.24em] text-gold">{block.day}</p>
                  <h3 className="mt-1 font-display text-3xl">{block.title}</h3>
                  <ol className="mt-4 divide-y divide-line border-y border-line">
                    {block.items.map(([when, what]) => (
                      <li key={when} className="grid grid-cols-[7rem_1fr] gap-4 py-3 text-sm">
                        <span className="text-mute">{when}</span>
                        <span>{what}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="rooms" className="w-full px-5 py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Who attends</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">One guest list. Distinct rooms.</h2>
            </div>
            <p className="text-sm text-mute">
              Access is by request, the way a serious exhibition separates visitors, exhibitors and delegates.
            </p>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {ATTENDEES.map((name) => (
              <li key={name} className="border border-line px-3 py-2 text-xs uppercase tracking-[0.14em]">
                {name}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <PhotoSlideshow
              images={WHO_ATTENDS_SLIDES}
              alt="Quiet investor lounge with walnut and brass lamps"
              className="aspect-[3/2] h-full w-full md:row-span-2"
            />
            {ROOMS.map((room) => (
              <article key={room.title} className="border border-line p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{room.kicker}</p>
                <h3 className="mt-2 font-display text-3xl">{room.title}</h3>
                <p className="mt-2 text-sm text-mute">{room.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="partners" className="border-t border-line bg-ink-2">
          <div className="w-full px-5 py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
              <div>
                <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Partnership</p>
                <h2 className="mt-3 font-display text-4xl sm:text-5xl">Presence with a purpose.</h2>
                <p className="mt-4 text-mute">
                  Partnerships are sold against a defined benefit. Briefs go out once the venue hold is confirmed.
                </p>
              </div>
              <div className="flex items-center gap-4 border border-line bg-ink p-4">
                <img
                  src="/images/partnership.png"
                  alt="Partnership presentation materials"
                  className="h-20 w-20 object-cover"
                />
                <p className="text-sm text-mute">
                  A sponsorship folder and formal invitation are sales instruments — not souvenirs.
                </p>
              </div>
            </div>
            <div className="mt-10 grid gap-px bg-line md:grid-cols-3">
              {TIERS.map((tier) => (
                <article key={tier.name} className="bg-ink p-6">
                  <Gem className="text-gold" size={18} strokeWidth={1.5} />
                  <h3 className="mt-4 font-display text-3xl">{tier.name}</h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-mute">{tier.note}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {tier.points.map((point) => (
                      <li key={point} className="border-t border-line pt-2">
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="press" className="w-full px-5 py-16">
          <div className="flex items-center gap-3 text-gold">
            <Radio size={18} strokeWidth={1.5} />
            <p className="text-[12px] uppercase tracking-[0.28em]">Press day — invited</p>
          </div>
          <p className="mt-3 text-sm text-mute">
            Television sends a camera and a reporter. Radio sends a reporter. Social news pages are a separate
            package. Names below are the working invitation list.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {MEDIA.map((name) => (
              <li key={name} className="border border-line px-3 py-2 text-xs uppercase tracking-[0.16em] text-cream">
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section id="organisers" className="border-t border-line bg-ink">
          <div className="w-full px-5 py-20">
            <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Organisers</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">The desk behind the room.</h2>
            <p className="mt-4 text-mute">
             The Ethiopian Business & Investment Forum 2026 is brought together by three complementary organizations: Commercial Nominees , Nexa Business Group PLC, and Paparazzi Media & Advertising.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {ORGANISERS.map((org) => (
                <OrganiserCard key={org.name} {...org} />
              ))}
            </div>
          </div>
        </section>
  <section id="register" className="border-t border-line">
          <div className="w-full grid gap-10 px-5 py-20 lg:grid-cols-2">
            <div>
              <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Register</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Register your interest.</h2>
              <p className="mt-4 text-mute">
                Tell the desk who you are and how you would like to take part. Registration is reviewed before a confirmed seat is issued.
              </p>
            </div>
            <form onSubmit={submit} autoComplete="off" className="space-y-4 border border-line bg-ink p-6">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => updateRegistration({ name: e.target.value })}
                  className="field"
                  autoComplete="off"
                />
              </Field>
              <Field label="Organisation">
                <input
                  value={form.organisation}
                  onChange={(e) => updateRegistration({ organisation: e.target.value })}
                  className="field"
                  autoComplete="off"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateRegistration({ email: e.target.value })}
                  className="field"
                  autoComplete="off"
                />
              </Field>
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => updateRegistration({ role: e.target.value })}
                  className="field"
                >
                  {ROLES.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </Field>
              <Field label="Note">
                <textarea
                  value={form.note}
                  onChange={(e) => updateRegistration({ note: e.target.value })}
                  rows={3}
                  className="field resize-none"
                />
              </Field>
              {error && <p className="text-sm text-rose">{error}</p>}
              <button
                type="submit"
                className={`h-12 w-full text-[12px] font-medium uppercase tracking-[0.18em] text-ink ${
                  saved ? "bg-emerald-700" : "bg-gold"
                }`}
              >
                {saved ? "Registration successful!" : "Submit registration"}
              </button>
            </form>
          </div>
        </section>
        
        <section id="pay" className="border-t border-line">
          <div className="w-full grid gap-10 px-5 py-20 lg:grid-cols-2">
            <div>
              <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Pay</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Pay the desk directly.</h2>
              <p className="mt-4 text-mute">
                Choose a pass and a method. This page records the order and a reference. It does not charge a card or a Telebirr wallet until a live gateway is connected.
              </p>
              <p className="mt-6 font-display text-5xl text-gold-2">
                {passPrice(pass)}{" "}
                {pass.amount !== null && <span className="text-2xl">ETB{pass.vat ? " + VAT" : ""}</span>}
              </p>
              <p className="text-sm text-mute">
                {pass.name} ·{" "}
                {pass.email ? (
                  <a href={`mailto:${pass.email}`} className="text-gold-2 underline underline-offset-4">
                    {pass.email}
                  </a>
                ) : (
                  pass.detail
                )}
              </p>
            </div>
            <form onSubmit={pay} className="space-y-4 border border-line bg-ink p-6">
              <div className="grid gap-2 sm:grid-cols-2">
                {PASSES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPassId(item.id)}
                    className={`border px-3 py-3 text-left ${item.id === passId ? "border-gold bg-ink-2" : "border-line"}`}
                  >
                    <span className="block text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-mute">{passPriceWithCurrency(item)}</span>
                  </button>
                ))}
              </div>
              {pass.email ? (
                <div className="space-y-4 border border-line bg-ink-2 p-5">
                  <p className="text-sm text-mute">
                    Sponsorship proposals are sent on request. Email the desk and we will send the document pack.
                  </p>
                  <a
                    href={`mailto:${pass.email}?subject=${encodeURIComponent("Sponsorship proposal request - Ethiopian Business and Investment Forum")}`}
                    className="flex h-12 w-full items-center justify-center bg-gold px-4 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-ink"
                  >
                    Email {pass.email}
                  </a>
                </div>
              ) : (
                <>
                  <Field label="Name">
                    <input className="field" value={payer.name} autoComplete="name" onChange={(e) => setPayer({ ...payer, name: e.target.value })} />
                  </Field>
                  <Field label="Organisation">
                    <input className="field" value={payer.organisation} onChange={(e) => setPayer({ ...payer, organisation: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className="field" value={payer.email} autoComplete="email" onChange={(e) => setPayer({ ...payer, email: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <input className="field" value={payer.phone} autoComplete="tel" inputMode="tel" onChange={(e) => setPayer({ ...payer, phone: e.target.value })} />
                  </Field>
                  <Field label="Method">
                    <select className="field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {METHODS.map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                  </Field>
                  {payError && <p className="text-sm text-rose">{payError}</p>}
                  {receipt && (
                    <p className="text-sm text-gold-2">
                      Order {receipt} is waiting for {payMethod}. No money has moved.
                    </p>
                  )}
                  <button type="submit" className="h-12 w-full bg-gold text-[12px] font-medium uppercase tracking-[0.18em] text-ink">
                    Place payment order · {passPriceWithCurrency(pass)}
                  </button>
                </>
              )}
            </form>
          </div>
        </section>

      
      </main>

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

      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed right-5 bottom-5 z-30 grid h-11 w-11 place-items-center border border-line bg-ink/90 text-cream shadow-lg backdrop-blur-md transition-colors hover:border-gold hover:text-gold"
      >
        <ArrowUp size={18} strokeWidth={1.75} />
      </button>

      <style>{`
        .field {
          width: 100%;
          background: transparent;
          border: 1px solid var(--color-line);
          color: var(--color-cream);
          padding: 0.75rem 0.85rem;
          font-size: 0.95rem;
          outline: none;
        }
        .field:focus { border-color: var(--color-gold); }
        select.field { background: var(--color-ink-2); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-mute">{label}</span>
      {children}
    </label>
  );
}
