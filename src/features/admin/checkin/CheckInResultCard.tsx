import { useEffect } from "react";
import { CheckCircle2, AlertCircle, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import type { CheckInRegistrationDetails } from "@/shared/types";

export type ResultType = "checked_in" | "already_checked_in" | "not_found";

interface CheckInResultCardProps {
  status: ResultType;
  registration?: CheckInRegistrationDetails;
  scannedCode?: string;
  onUndo?: (registrationId: string) => Promise<void> | void;
  onClear: () => void;
  undoing?: boolean;
}

export function CheckInResultCard({
  status,
  registration,
  scannedCode,
  onUndo,
  onClear,
  undoing = false,
}: CheckInResultCardProps) {
  // Trigger short tactile vibration on check-in success where supported
  useEffect(() => {
    if (status === "checked_in" && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Safe ignore
      }
    }
  }, [status]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoString;
    }
  };

  if (status === "checked_in" && registration) {
    return (
      <div className="border-2 border-emerald-500/70 bg-emerald-950/40 p-5 rounded-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Checked In
              </span>
              <h2 className="mt-1 text-lg sm:text-xl font-bold text-cream">
                {registration.fullName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] bg-ink-2 border border-line text-cream hover:border-gold transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-500/20 pt-3 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Organization</p>
            <p className="font-medium text-cream truncate">{registration.organization}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Attendee Type</p>
            <p className="font-medium text-gold">{registration.attendeeType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Job Title</p>
            <p className="font-medium text-cream truncate">{registration.jobTitle}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Time Verified</p>
            <p className="font-medium text-emerald-300">{formatTime(registration.checkedInAt)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-emerald-500/20 pt-3">
          <p className="text-[11px] text-mute font-mono">
            Ticket: <span className="text-cream">{registration.ticketCode}</span>
          </p>
          {onUndo && (
            <button
              type="button"
              disabled={undoing}
              onClick={() => onUndo(registration.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose hover:text-rose-light transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw size={13} className={undoing ? "animate-spin" : ""} />
              <span>{undoing ? "Undoing..." : "Undo Check-in"}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === "already_checked_in" && registration) {
    return (
      <div className="border-2 border-amber-500/70 bg-amber-950/40 p-5 rounded-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Already Checked In
              </span>
              <h2 className="mt-1 text-lg sm:text-xl font-bold text-cream">
                {registration.fullName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] bg-ink-2 border border-line text-cream hover:border-gold transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-amber-500/20 pt-3 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Organization</p>
            <p className="font-medium text-cream truncate">{registration.organization}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Attendee Type</p>
            <p className="font-medium text-gold">{registration.attendeeType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Earlier Time</p>
            <p className="font-medium text-amber-300">{formatTime(registration.checkedInAt)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Verified By</p>
            <p className="font-medium text-cream truncate">{registration.checkedInBy}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-amber-500/20 pt-3">
          <p className="text-[11px] text-mute font-mono">
            Ticket: <span className="text-cream">{registration.ticketCode}</span>
          </p>
          <span className="text-[11px] text-amber-400/90 font-medium">
            Record was not modified
          </span>
        </div>
      </div>
    );
  }

  // Not found status
  return (
    <div className="border-2 border-rose/70 bg-rose-950/40 p-5 rounded-none animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/20 text-rose">
            <XCircle size={24} />
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] bg-rose/20 text-rose border border-rose/40">
              Ticket Not Found
            </span>
            <h2 className="mt-1 text-lg sm:text-xl font-bold text-cream">
              Unknown Ticket Code
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] bg-ink-2 border border-line text-cream hover:border-gold transition-colors cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="mt-4 border-t border-rose/20 pt-3 text-xs text-mute">
        <p className="mb-2">
          No registered attendee was found matching code:{" "}
          <strong className="font-mono text-cream">{scannedCode || "—"}</strong>
        </p>
        <p className="text-[11px]">
          Please ensure the code is correct, or search for the attendee below using their name, phone number, or email address.
        </p>
      </div>
    </div>
  );
}
