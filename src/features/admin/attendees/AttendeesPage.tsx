import { useEffect, useState, useCallback } from "react";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  RotateCcw,
  TrendingUp,
  Users,
  CheckCircle2,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getAttendees, resendAttendeeEmail } from "@/lib/api";
import type { AttendeeItem, AttendeeStats } from "@/shared/types";
import type { AttendeesQueryInput } from "@/shared/schemas";
import { StatCard } from "../components/StatCard";
import { SearchInput } from "../components/SearchInput";
import { FilterSelect } from "../components/FilterSelect";
import { StatusBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";
import { DataTable, type Column } from "../components/DataTable";

const PAGE_SIZE = 10;

const ATTENDEE_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "company", label: "Company" },
  { value: "investor", label: "Investor" },
  { value: "government", label: "Government" },
  { value: "international_partner", label: "International" },
] as const;

const DATE_FILTER_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

const CHECK_IN_STATUS_OPTIONS = [
  { value: "all", label: "Check-in: All" },
  { value: "checked_in", label: "Checked In" },
  { value: "not_checked_in", label: "Not Checked In" },
] as const;

const CHECK_IN_DAY_OPTIONS = [
  { value: "1", label: "Day 1 (Nov 28)" },
  { value: "2", label: "Day 2 (Nov 29)" },
] as const;

export function AttendeesPage() {
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<AttendeeStats>({
    total: 0,
    today: 0,
    company: 0,
    investor: 0,
    government: 0,
    internationalPartner: 0,
    checkedInToday: 0,
  });
  const [error, setError] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [checkInStatusFilter, setCheckInStatusFilter] = useState<string>("all");
  const [checkInDayFilter, setCheckInDayFilter] = useState<string>("1");
  const [sortAscending, setSortAscending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Resend email action loading state
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchAttendeesData = useCallback(async () => {
    setError("");

    try {
      const params: AttendeesQueryInput = {
        search: searchQuery,
        attendeeType: typeFilter as AttendeesQueryInput["attendeeType"],
        range: dateFilter as AttendeesQueryInput["range"],
        sort: sortAscending ? "oldest" : "newest",
        checkInStatus: checkInStatusFilter as AttendeesQueryInput["checkInStatus"],
        checkInDay: parseInt(checkInDayFilter, 10) as 1 | 2,
        page: currentPage,
        pageSize: PAGE_SIZE,
      };

      const res = await getAttendees(params);
      setAttendees(res.items);
      setTotalCount(res.total);
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendees.");
    }
  }, [searchQuery, typeFilter, dateFilter, sortAscending, checkInStatusFilter, checkInDayFilter, currentPage]);

  useEffect(() => {
    fetchAttendeesData();
  }, [fetchAttendeesData]);

  // Reset page when filters change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleTypeChange = (t: string) => {
    setTypeFilter(t);
    setCurrentPage(1);
  };

  const handleDateChange = (d: string) => {
    setDateFilter(d);
    setCurrentPage(1);
  };

  const handleCheckInStatusChange = (status: string) => {
    setCheckInStatusFilter(status);
    setCurrentPage(1);
  };

  const handleCheckInDayChange = (day: string) => {
    setCheckInDayFilter(day);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    typeFilter !== "all" ||
    dateFilter !== "all" ||
    checkInStatusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDateFilter("all");
    setCheckInStatusFilter("all");
    setCheckInDayFilter("1");
    setCurrentPage(1);
  };

  const handleResendEmail = async (attendee: AttendeeItem) => {
    setResendingId(attendee.id);
    try {
      await resendAttendeeEmail(attendee.id);
      setAttendees((currentAttendees) =>
        currentAttendees.map((currentAttendee) =>
          currentAttendee.id === attendee.id
            ? { ...currentAttendee, emailStatus: "sent", emailError: null }
            : currentAttendee,
        ),
      );
      toast.success(`Confirmation email resent to ${attendee.email}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend confirmation email");
    } finally {
      setResendingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatAttendeeType = (type: string) => {
    switch (type) {
      case "company":
        return "Company";
      case "investor":
        return "Investor";
      case "government":
        return "Government Institution";
      case "international_partner":
        return "International Partner";
      default:
        return type;
    }
  };

  const columns: Column<AttendeeItem>[] = [
    {
      header: "Full Name",
      cell: (item) => (
        <div>
          <p className="font-medium text-cream">{item.fullName}</p>
          <p className="text-[10px] text-mute font-mono">
            {item.reference}
            {item.ticketCode ? ` • ${item.ticketCode}` : ""}
          </p>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cellClassName: "font-mono text-mute",
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cellClassName: "font-mono text-mute",
    },
    {
      header: "Email status",
      cell: (item) =>
        item.emailStatus ? (
          <span
            title={
              item.emailStatus === "failed"
                ? item.emailError || "Email delivery failed"
                : "Confirmation email sent"
            }
            className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              item.emailStatus === "sent"
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-rose/50 bg-rose/10 text-rose"
            }`}
          >
            {item.emailStatus === "sent" ? "Sent" : "Failed"}
          </span>
        ) : null,
    },
    {
      header: "Organization",
      accessorKey: "organization",
    },
    {
      header: "Job Title",
      accessorKey: "jobTitle",
      cellClassName: "text-mute",
    },
    {
      header: "Attendee Type",
      cell: (item) => <StatusBadge attendeeType={formatAttendeeType(item.attendeeType)} />,
    },
    {
      header: "Check-in",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <span
            title={item.day1CheckedIn ? "Checked in on Day 1" : "Not checked in on Day 1"}
            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
              item.day1CheckedIn
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-line bg-ink-2/30 text-mute/40"
            }`}
          >
            D1
          </span>
          <span
            title={item.day2CheckedIn ? "Checked in on Day 2" : "Not checked in on Day 2"}
            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
              item.day2CheckedIn
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-line bg-ink-2/30 text-mute/40"
            }`}
          >
            D2
          </span>
        </div>
      ),
    },
    {
      header: (
        <button
          type="button"
          onClick={() => setSortAscending((prev) => !prev)}
          className="inline-flex items-center gap-1.5 uppercase tracking-[0.16em] hover:text-gold transition-colors cursor-pointer"
          title="Click to sort by date"
        >
          <span>Registered On</span>
          <ArrowUpDown size={12} className={sortAscending ? "rotate-180" : ""} />
        </button>
      ),
      cell: (item) => <span className="text-mute">{formatDate(item.createdAt)}</span>,
    },
    {
      header: "Actions",
      cell: (item) => (
        <button
          type="button"
          disabled={resendingId === item.id}
          onClick={() => handleResendEmail(item)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-line bg-ink-2 text-mute hover:text-cream hover:border-gold transition-colors disabled:opacity-50 cursor-pointer"
          title="Resend confirmation email with QR code"
        >
          {resendingId === item.id ? (
            <Loader2 size={12} className="animate-spin text-gold" />
          ) : (
            <Mail size={12} className="text-gold" />
          )}
          <span>Resend Email</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Registrants"
          value={stats.total}
          subtitle="All confirmed entries"
          icon={<Users size={20} strokeWidth={1.5} />}
        />
        <StatCard
          label="Today's Registrations"
          value={stats.today}
          subtitle="Signed up today"
          icon={<Calendar size={20} strokeWidth={1.5} />}
        />
        <StatCard
          label="Checked In Today"
          value={stats.checkedInToday ?? 0}
          subtitle="Scanned & desk verified"
          icon={<CheckCircle2 size={20} strokeWidth={1.5} className="text-emerald-400" />}
        />
        <StatCard
          label="Company Attendees"
          value={stats.company}
          subtitle="Corporate & enterprises"
          icon={<Building2 size={20} strokeWidth={1.5} />}
        />
        <StatCard
          label="Investors"
          value={stats.investor}
          subtitle="Funds & capital principals"
          icon={<TrendingUp size={20} strokeWidth={1.5} />}
        />
      </div>

      {/* Toolbar */}
      <div className="border border-line bg-ink p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search name, email, phone, organization, ticket..."
              className="w-full sm:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                id="attendee-type-filter"
                value={typeFilter}
                options={ATTENDEE_TYPE_OPTIONS}
                onChange={handleTypeChange}
              />
              <FilterSelect
                id="attendee-date-filter"
                value={dateFilter}
                options={DATE_FILTER_OPTIONS}
                onChange={handleDateChange}
              />
              <FilterSelect
                id="attendee-checkin-status-filter"
                value={checkInStatusFilter}
                options={CHECK_IN_STATUS_OPTIONS}
                onChange={handleCheckInStatusChange}
              />
              {checkInStatusFilter !== "all" && (
                <FilterSelect
                  id="attendee-checkin-day-filter"
                  value={checkInDayFilter}
                  options={CHECK_IN_DAY_OPTIONS}
                  onChange={handleCheckInDayChange}
                />
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-line px-3 text-xs uppercase tracking-[0.14em] font-medium text-mute transition-colors hover:border-gold hover:text-gold cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="border border-rose/30 bg-rose/10 p-5 text-center">
          <p className="text-xs text-rose">{error}</p>
          <button
            type="button"
            onClick={fetchAttendeesData}
            className="mt-3 inline-flex h-9 items-center border border-rose px-4 text-xs uppercase tracking-[0.14em] text-rose hover:bg-rose/10 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Attendees Table */}
      {!error ? (
        <div>
          <DataTable
            columns={columns}
            data={attendees}
            keyExtractor={(item) => item.id}
            emptyMessage={hasActiveFilters ? "No attendees match your filters." : "No attendees yet."}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : null}
    </div>
  );
}
