type AdminStatus = "Active" | "Disabled";

type StatusBadgeProps = {
  status?: AdminStatus;
  attendeeType?: string;
  label?: string;
};

export function StatusBadge({ status, attendeeType, label }: StatusBadgeProps) {
  if (status) {
    const isActive = status === "Active";
    return (
      <span
        className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.06em] ${
          isActive
            ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700"
            : "border-line bg-ink-2 text-mute"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-mute"}`}
          aria-hidden="true"
        />
        {status}
      </span>
    );
  }

  if (attendeeType) {
    let colorClasses = "border-line bg-ink text-mute";
    const lower = attendeeType.toLowerCase();
    if (lower.includes("company")) {
      colorClasses = "border-gold/30 bg-gold/10 text-gold-2";
    } else if (lower.includes("investor")) {
      colorClasses = "border-indigo-300/40 bg-indigo-50/50 text-indigo-700";
    } else if (lower.includes("gov")) {
      colorClasses = "border-amber-300/40 bg-amber-50/50 text-amber-700";
    } else if (lower.includes("international") || lower.includes("partner")) {
      colorClasses = "border-teal-300/40 bg-teal-50/50 text-teal-800";
    }

    return (
      <span
        className={`inline-flex items-center border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${colorClasses}`}
      >
        {attendeeType}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center border border-line bg-ink px-2.5 py-0.5 text-[11px] font-medium text-mute">
      {label}
    </span>
  );
}
