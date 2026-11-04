import { useEffect, useState, useCallback } from "react";
import { Check, Copy, KeyRound, Plus, UserCheck } from "lucide-react";
import { createAdmin, getAdmins, getAdminMe, updateAdminStatus } from "@/lib/api";
import type { AdminItem, AdminStatus, AdminMeResponse } from "@/shared/types";
import type { AdminsQueryInput } from "@/shared/schemas";
import { SearchInput } from "../components/SearchInput";
import { FilterSelect } from "../components/FilterSelect";
import { StatusBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { CopyField } from "../components/CopyField";

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
] as const;

export function AdminsPage() {
  const [currentSession, setCurrentSession] = useState<AdminMeResponse | null>(null);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Add Admin Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // Generated state returned by server
  const [createdResult, setCreatedResult] = useState<{ email: string; password: string } | null>(null);
  const [copiedBoth, setCopiedBoth] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchAdminsData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params: AdminsQueryInput = {
        search: searchQuery,
        status: statusFilter as AdminsQueryInput["status"],
        page: currentPage,
        pageSize: PAGE_SIZE,
      };

      const [adminsRes, meRes] = await Promise.all([
        getAdmins(params),
        getAdminMe().catch(() => null),
      ]);

      setAdmins(adminsRes.items);
      setTotalCount(adminsRes.total);
      if (meRes) setCurrentSession(meRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load administrators.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    fetchAdminsData();
  }, [fetchAdminsData]);

  const validateUsername = (raw: string): string => {
    const val = raw.trim().toLowerCase();
    if (!val) return "Username is required.";
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(val)) {
      return "3–30 characters, letters, numbers, dots, and underscores only.";
    }
    const exists = admins.some((a) => a.username.toLowerCase() === val);
    if (exists) {
      return `Username "${val}" already exists.`;
    }
    return "";
  };

  const handleOpenModal = () => {
    setUsernameInput("");
    setUsernameTouched(false);
    setUsernameError("");
    setCreatedResult(null);
    setCopiedBoth(false);
    setIsSaving(false);
    setSaveError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    // Clear password and generated credentials from memory on modal close
    setIsModalOpen(false);
    setUsernameInput("");
    setCreatedResult(null);
    setCopiedBoth(false);
    setSaveError("");
  };

  const handleCreateAdmin = async () => {
    const err = validateUsername(usernameInput);
    setUsernameTouched(true);
    setUsernameError(err);
    if (err) return;

    setIsSaving(true);
    setSaveError("");

    try {
      const result = await createAdmin({ username: usernameInput.trim() });
      setCreatedResult(result);
      await fetchAdminsData();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to create administrator.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyBoth = async () => {
    if (!createdResult) return;
    const text = `Username: ${usernameInput.trim().toLowerCase()}\nEmail: ${createdResult.email}\nPassword: ${createdResult.password}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        // Fallback
      }
    }
    setCopiedBoth(true);
    setTimeout(() => setCopiedBoth(false), 2000);
  };

  const handleToggleStatus = async (admin: AdminItem) => {
    if (admin.id === currentSession?.id || admin.username === currentSession?.username) {
      return; // Cannot disable self
    }

    const nextStatus: AdminStatus = admin.status === "active" ? "disabled" : "active";
    try {
      await updateAdminStatus(admin.id, nextStatus);
      await fetchAdminsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update administrator status.");
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const columns: Column<AdminItem>[] = [
    {
      header: "Username",
      cell: (item) => {
        const isCurrent =
          item.id === currentSession?.id || item.username === currentSession?.username;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-cream">{item.username}</span>
            {isCurrent && (
              <span className="border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gold font-semibold">
                You
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Email",
      accessorKey: "email",
      cellClassName: "font-mono text-mute",
    },
    {
      header: "Status",
      cell: (item) => (
        <StatusBadge status={item.status === "active" ? "Active" : "Disabled"} />
      ),
    },
    {
      header: "Created On",
      cell: (item) => <span className="text-mute">{formatDate(item.createdAt)}</span>,
    },
    {
      header: "Role",
      accessorKey: "role",
      cellClassName: "text-mute uppercase text-[10px] tracking-[0.1em]",
    },
    {
      header: "Action",
      cell: (item) => {
        const isCurrent =
          item.id === currentSession?.id || item.username === currentSession?.username;
        if (isCurrent) {
          return (
            <span className="text-[11px] text-mute/50 italic select-none">
              Active session
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(item)}
            className="border border-line px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] font-medium text-mute transition-colors hover:border-gold hover:text-gold cursor-pointer"
          >
            {item.status === "active" ? "Disable" : "Enable"}
          </button>
        );
      },
    },
  ];

  const isUsernameValid =
    usernameInput.trim().length >= 3 &&
    usernameInput.trim().length <= 30 &&
    /^[a-zA-Z0-9._]+$/.test(usernameInput.trim()) &&
    !admins.some((a) => a.username.toLowerCase() === usernameInput.trim().toLowerCase());

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="border border-line bg-ink p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
              placeholder="Search username or email..."
              className="w-full sm:max-w-xs"
            />
            <FilterSelect
              id="admin-status-filter"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={(s) => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex h-10 items-center justify-center gap-2 border border-gold bg-gold px-4 text-xs font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-gold-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add admin</span>
          </button>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="border border-rose/30 bg-rose/10 p-5 text-center">
          <p className="text-xs text-rose">{error}</p>
          <button
            type="button"
            onClick={fetchAdminsData}
            className="mt-3 inline-flex h-9 items-center border border-rose px-4 text-xs uppercase tracking-[0.14em] text-rose hover:bg-rose/10 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Admins Table */}
      {loading ? (
        <div className="border border-line bg-ink p-12 text-center text-sm text-mute">
          Loading administrators...
        </div>
      ) : !error ? (
        <div>
          <DataTable
            columns={columns}
            data={admins}
            keyExtractor={(item) => item.id}
            emptyMessage="No administrators match your search or filter."
          />
          <Pagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : null}

      {/* Add Admin Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title="Add administrator"
        subtitle="Generate and provision credentials for a new platform administrator."
        maxWidthClass="sm:max-w-lg"
      >
        <div className="space-y-5">
          {!createdResult ? (
            /* Step 1: Input username and generate */
            <div>
              <label
                htmlFor="new-admin-username"
                className="block text-[11px] font-medium uppercase tracking-[0.16em] text-mute mb-1.5"
              >
                Username <span className="text-rose">*</span>
              </label>
              <input
                id="new-admin-username"
                type="text"
                disabled={isSaving}
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  if (usernameTouched) {
                    setUsernameError(validateUsername(e.target.value));
                  }
                }}
                onBlur={() => {
                  setUsernameTouched(true);
                  setUsernameError(validateUsername(usernameInput));
                }}
                placeholder="e.g. feven.negussie"
                className={`h-10 w-full border bg-ink px-3 text-sm text-cream transition-colors placeholder:text-mute/60 outline-none ${
                  usernameError && usernameTouched
                    ? "border-rose"
                    : "border-line focus:border-gold"
                }`}
              />
              {usernameError && usernameTouched ? (
                <p className="mt-1 text-xs text-rose">{usernameError}</p>
              ) : (
                <p className="mt-1 text-xs text-mute">
                  3–30 characters: letters, numbers, dots, and underscores only.
                </p>
              )}

              {saveError && <p className="mt-2 text-xs text-rose">{saveError}</p>}

              <div className="pt-4">
                <button
                  type="button"
                  disabled={!isUsernameValid || isSaving}
                  onClick={handleCreateAdmin}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 border text-xs font-medium uppercase tracking-[0.16em] transition-colors ${
                    isUsernameValid && !isSaving
                      ? "border-gold bg-gold text-ink hover:bg-gold-2 cursor-pointer"
                      : "cursor-not-allowed border-line bg-ink-2 text-mute"
                  }`}
                >
                  <KeyRound size={15} />
                  <span>{isSaving ? "Provisioning administrator..." : "Generate and save admin"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Generated Credentials view */
            <div className="space-y-4">
              <CopyField
                id="generated-admin-email"
                label="Generated email"
                value={createdResult.email}
              />

              <div>
                <CopyField
                  id="generated-admin-password"
                  label="Generated random password"
                  value={createdResult.password}
                  isSecret={true}
                />
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleCopyBoth}
                    className="inline-flex items-center gap-1.5 border border-line bg-ink px-2.5 py-1 text-xs uppercase tracking-[0.12em] font-medium text-cream hover:border-gold hover:text-gold cursor-pointer"
                  >
                    {copiedBoth ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700">Copied both</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy both</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Security notice */}
              <div className="border border-amber-300/40 bg-amber-50/40 p-3 text-xs text-amber-900">
                <p className="font-semibold uppercase tracking-[0.1em] text-[10px]">
                  Security Notice
                </p>
                <p className="mt-0.5">
                  This password is shown only once. Copy it and share it securely with the administrator.
                </p>
              </div>

              {/* Done button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 border border-gold bg-gold text-xs font-medium uppercase tracking-[0.16em] text-ink hover:bg-gold-2 cursor-pointer transition-colors"
                >
                  <UserCheck size={16} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
