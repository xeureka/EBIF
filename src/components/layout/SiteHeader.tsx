import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useRegistrationModal } from "@/components/registration/RegistrationModalProvider";

type NavItem = { href: string; label: string; newTab?: boolean };

const NAV: NavItem[] = [
  { href: "#gathering", label: "About" },
  { href: "#programme", label: "Programme" },
  { href: "#rooms", label: "Who attends" },
  { href: "#join", label: "Join" },
  { href: "#organisers", label: "Organisers" },
  { href: "/evisa", label: "eVisa", newTab: true },
];

export function SiteHeader({ homePrefix = "" }: { homePrefix?: string }) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { openRegistration } = useRegistrationModal();

  return (
    <header className="w-full sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-5">
        <a
          href={homePrefix || "/"}
          aria-label="Ethiopian Business and Investment Forum"
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <img
            src="/images/LOGO.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 shrink-0 rounded-full border border-line bg-white object-cover"
          />
          {/* Small screens: EBIF + subtitle (subtitle dropped below 360px) */}
          <div className="flex min-w-0 flex-col items-start min-[1300px]:hidden" aria-hidden="true">
            <span className="whitespace-nowrap font-display text-lg leading-none uppercase tracking-[0.04em]">
              EBIF
            </span>
            <span className="hidden min-[360px]:block max-w-full truncate whitespace-nowrap text-[10px] sm:text-[11px] leading-tight tracking-[0.14em] text-mute mt-0.5">
              Business & Investment Forum
            </span>
          </div>
          {/* Large screens: current full name, unchanged */}
          <span className="hidden min-[1300px]:inline whitespace-nowrap font-display text-[clamp(0.72rem,3.5vw,1.25rem)] tracking-[0.04em]">
            ETHIOPIAN BUSINESS AND INVESTMENT FORUM
          </span>
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
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
          <button
            type="button"
            onClick={() => openRegistration()}
            className="border border-gold bg-gold px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-2"
          >
            Register
          </button>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center border border-line lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-ink px-5 py-4 lg:hidden">
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
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openRegistration(menuButtonRef.current ?? undefined);
            }}
            className="mt-2 w-full border border-gold bg-gold px-4 py-3 text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-2"
          >
            Register
          </button>
        </div>
      )}
    </header>
  );
}
