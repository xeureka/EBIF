import { Mail, Phone, type LucideIcon } from "lucide-react";
import { event } from "@/data/event";

type ContactInfoProps = {
  compact?: boolean;
  className?: string;
};

type ContactBoxProps = {
  label: string;
  icon: LucideIcon;
  items: readonly string[];
  hrefPrefix: "tel:" | "mailto:";
  compact: boolean;
};

function ContactBox({ label, icon: Icon, items, hrefPrefix, compact }: ContactBoxProps) {
  return (
    <div className="border border-line bg-ink">
      <p
        className={`border-b border-line uppercase font-medium tracking-[0.22em] text-mute ${
          compact ? "px-3 py-2 text-[10px]" : "px-4 py-3 text-[11px]"
        }`}
      >
        {label}
      </p>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <a
            key={item}
            href={`${hrefPrefix}${item}`}
            className={`flex items-center gap-3 text-sm text-cream transition-colors hover:underline ${
              compact ? "px-3 py-2.5" : "px-4 py-3"
            }`}
          >
            <Icon size={16} strokeWidth={1.5} className="shrink-0 text-gold" />
            <span>{item}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function ContactInfo({ compact = false, className = "" }: ContactInfoProps) {
  const boxes = (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <ContactBox label="PHONE" icon={Phone} items={event.phones} hrefPrefix="tel:" compact={compact} />
      <ContactBox label="EMAIL" icon={Mail} items={event.emails} hrefPrefix="mailto:" compact={compact} />
    </div>
  );

  if (compact) return boxes;

  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.28em] text-gold font-medium">CONTACT</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl">Contact Info</h2>
      <div className="mt-8">{boxes}</div>
    </div>
  );
}
