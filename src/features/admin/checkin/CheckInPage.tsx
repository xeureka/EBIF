import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  Calendar,
  CheckCircle2,
  Search,
  UserPlus,
  QrCode,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { getCurrentEventDay } from "@/data/event";
import {
  checkInScan,
  checkInByRegistration,
  undoCheckIn,
  getCheckInStats,
  searchCheckInAttendees,
} from "@/lib/api";
import type {
  CheckInStatsData,
  CheckInRegistrationDetails,
  CheckInSearchAttendeeItem,
  CheckInResponse,
} from "@/shared/types";
import { QrScanner } from "./QrScanner";
import { CheckInResultCard, type ResultType } from "./CheckInResultCard";
import { WalkInModal } from "./WalkInModal";

export function CheckInPage() {
  const [selectedDay, setSelectedDay] = useState<1 | 2>(() => getCurrentEventDay());
  const [stats, setStats] = useState<CheckInStatsData | null>(null);

  // Result panel state
  const [resultState, setResultState] = useState<{
    status: ResultType;
    registration?: CheckInRegistrationDetails;
    scannedCode?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Manual code input
  const [manualCode, setManualCode] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CheckInSearchAttendeeItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Walk-in modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);

  // Fetch stats for the selected day
  const fetchStats = useCallback(async (day: 1 | 2) => {
    try {
      const res = await getCheckInStats(day);
      setStats(res.stats);
    } catch {
      console.error("Failed to fetch check-in stats");
    }
  }, []);

  useEffect(() => {
    fetchStats(selectedDay);
  }, [selectedDay, fetchStats]);

  // Execute scan check-in
  const handleScanCode = async (code: string) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await checkInScan({
        code,
        day: selectedDay,
        method: "qr",
      });

      setResultState({
        status: res.status,
        registration: res.registration,
        scannedCode: code,
      });

      fetchStats(selectedDay);
    } catch {
      setResultState({
        status: "not_found",
        scannedCode: code,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit manual code
  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    setManualSubmitting(true);
    try {
      const res = await checkInScan({
        code: clean,
        day: selectedDay,
        method: "manual",
      });

      setResultState({
        status: res.status,
        registration: res.registration,
        scannedCode: clean,
      });

      setManualCode("");
      fetchStats(selectedDay);
    } catch {
      setResultState({
        status: "not_found",
        scannedCode: clean,
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  // Search attendees debounced
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchCheckInAttendees(term, selectedDay);
        setSearchResults(res.items);
      } catch {
        console.error("Search check-in error");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedDay]);

  // Check in by search result row
  const handleCheckInByRow = async (attendee: CheckInSearchAttendeeItem) => {
    setActionLoading(true);
    try {
      const res = await checkInByRegistration({
        registrationId: attendee.id,
        day: selectedDay,
      });

      setResultState({
        status: res.status,
        registration: res.registration,
      });

      // Update local row status
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === attendee.id
            ? {
                ...item,
                isCheckedIn: true,
                checkedInAt: res.registration?.checkedInAt || new Date().toISOString(),
                checkedInBy: res.registration?.checkedInBy || "Admin",
              }
            : item,
        ),
      );

      fetchStats(selectedDay);
    } catch (err) {
      console.error("Row check-in error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Undo check-in
  const handleUndo = async (registrationId: string) => {
    setUndoing(true);
    try {
      await undoCheckIn({
        registrationId,
        day: selectedDay,
      });

      // Clear or update result panel
      setResultState(null);

      // Update search result if present
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === registrationId
            ? {
                ...item,
                isCheckedIn: false,
                checkedInAt: null,
                checkedInBy: null,
              }
            : item,
        ),
      );

      fetchStats(selectedDay);
    } catch (err) {
      console.error("Undo error:", err);
    } finally {
      setUndoing(false);
    }
  };

  // Walk-in registration success callback
  const handleWalkInSuccess = (res: CheckInResponse) => {
    setResultState({
      status: "checked_in",
      registration: res.registration,
    });
    fetchStats(selectedDay);
  };

  const percentCheckedIn =
    stats && stats.total > 0
      ? Math.round((stats.checkedIn / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Controls: Day selector & Walk-in button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border border-line bg-ink-2/40 p-4">
        {/* Day Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gold shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute mr-1">
            Event Day:
          </span>
          <div className="inline-flex border border-line bg-ink">
            <button
              type="button"
              onClick={() => setSelectedDay(1)}
              className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                selectedDay === 1
                  ? "bg-gold text-ink font-bold"
                  : "text-mute hover:text-cream"
              }`}
            >
              Day 1 (Nov 28)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(2)}
              className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                selectedDay === 2
                  ? "bg-gold text-ink font-bold"
                  : "text-mute hover:text-cream"
              }`}
            >
              Day 2 (Nov 29)
            </button>
          </div>
        </div>

        {/* Walk-in Registration Button */}
        <button
          type="button"
          onClick={() => setWalkInModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gold/40 bg-gold/15 text-gold text-xs font-bold uppercase tracking-[0.14em] hover:bg-gold/25 transition-colors cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Register Walk-in</span>
        </button>
      </div>

      {/* Progress & Live Counter Panel */}
      <div className="border border-line bg-ink-2/60 p-5">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Live Check-in Progress
            </p>
            <p className="text-xl sm:text-2xl font-bold font-display text-cream">
              Checked in <span className="text-gold">{stats?.checkedIn ?? 0}</span> of{" "}
              <span>{stats?.total ?? 0}</span>
            </p>
          </div>
          <span className="text-lg font-bold font-mono text-cream">
            {percentCheckedIn}%
          </span>
        </div>

        {/* Thin Gold Progress Bar */}
        <div className="h-2 w-full bg-ink border border-line overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-2 transition-all duration-300"
            style={{ width: `${percentCheckedIn}%` }}
          />
        </div>

        {/* Breakdown by Type Chips */}
        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-mute pt-3 border-t border-line/60">
            {Object.entries(stats.byType).map(([type, counts]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-line bg-ink/70"
              >
                <span className="text-cream">{type}:</span>
                <span className="font-semibold text-gold">
                  {counts.checkedIn}/{counts.total}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Result Panel (if any scan or check-in has occurred) */}
      {resultState && (
        <CheckInResultCard
          status={resultState.status}
          registration={resultState.registration}
          scannedCode={resultState.scannedCode}
          onUndo={resultState.status === "checked_in" ? handleUndo : undefined}
          onClear={() => setResultState(null)}
          undoing={undoing}
        />
      )}

      {/* QR Scanner Panel */}
      <QrScanner onScan={handleScanCode} disabled={actionLoading} />

      {/* Manual Ticket Code Entry */}
      <div className="border border-line bg-ink-2/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream mb-2 flex items-center gap-2">
          <QrCode size={15} className="text-gold" />
          <span>Manual Ticket Code Entry</span>
        </h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. K7M2-9QXA-4TWB"
            className="flex-1 border border-line bg-ink px-3 py-2 text-xs font-mono uppercase text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={manualSubmitting || !manualCode.trim()}
            className="flex items-center gap-1.5 px-4 py-2 border border-gold/50 bg-gold/15 text-gold text-xs font-bold uppercase tracking-[0.12em] hover:bg-gold/25 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {manualSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>Check In</span>
          </button>
        </form>
      </div>

      {/* Attendee Search Panel */}
      <div className="border border-line bg-ink-2/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream mb-2 flex items-center gap-2">
          <Search size={15} className="text-gold" />
          <span>Search Attendees (Phone, Email, or Name)</span>
        </h3>
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by attendee phone (09... or 9...), email, or full name..."
            className="w-full border border-line bg-ink px-3 py-2 text-xs text-cream placeholder:text-mute/60 focus:border-gold focus:outline-none"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5 text-gold">
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}
        </div>

        {/* Results List */}
        {searchQuery.trim().length > 0 && (
          <div className="space-y-2">
            {searchResults.length === 0 && !searchLoading && (
              <p className="text-xs text-mute py-3 text-center border border-dashed border-line">
                No matching attendees found.
              </p>
            )}

            {searchResults.map((attendee) => (
              <div
                key={attendee.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-line bg-ink hover:border-gold/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-xs text-cream truncate">
                      {attendee.fullName}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.2 border border-gold/30 bg-gold/10 text-gold shrink-0">
                      {attendee.attendeeType}
                    </span>
                  </div>
                  <p className="text-[11px] text-mute truncate mt-0.5">
                    {attendee.organization} &bull; {attendee.jobTitle}
                  </p>
                  <p className="text-[11px] text-mute font-mono mt-0.5">
                    {attendee.phone} &bull; {attendee.email}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {attendee.isCheckedIn ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                        <CheckCircle2 size={12} />
                        <span>
                          Checked In (
                          {attendee.checkedInAt
                            ? new Date(attendee.checkedInAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Today"}
                          )
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUndo(attendee.id)}
                        disabled={undoing}
                        className="px-2 py-1 text-xs text-rose hover:text-rose-light border border-line hover:border-rose transition-colors cursor-pointer"
                        title="Undo check-in"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleCheckInByRow(attendee)}
                      className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] bg-gold/15 border border-gold/40 text-gold hover:bg-gold/25 transition-colors cursor-pointer"
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Walk-in Registration Modal */}
      <WalkInModal
        open={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        day={selectedDay}
        onSuccess={handleWalkInSuccess}
      />
    </div>
  );
}
