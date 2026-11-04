import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = { href: string; label: string; newTab?: boolean };

const NAV: NavItem[] = [
  { href: "#gathering", label: "About" },
  { href: "#programme", label: "Programme" },
  { href: "#rooms", label: "Who attends" },
  { href: "#join", label: "Join" },
  { href: "#organisers", label: "Organisers" },
  { href: "/evisa", label: "eVisa", newTab: true },
];

export function SiteHeader({
  homePrefix = "",
  registerHref = "#register",
}: {
  homePrefix?: string;
  registerHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-5">
        <a href={`${homePrefix}#top`} className="flex min-w-0 items-center gap-2.5">
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
              key={item.label}
              href={item.newTab ? item.href : `${homePrefix}${item.href}`}
              {...(item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-[12px] uppercase tracking-[0.18em] text-mute transition-colors hover:text-cream"
            >
              {item.label}
            </a>
          ))}
          <a
            href={registerHref}
            className="border border-gold bg-gold px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-2"
          >
            Register
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
              key={item.label}
              href={item.newTab ? item.href : `${homePrefix}${item.href}`}
              {...(item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm uppercase tracking-[0.16em] text-cream"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
