import type {
  AttendeesResponse,
  AdminsResponse,
  AdminMeResponse,
  AdminStatus,
  CheckInResponse,
  CheckInStatsResponse,
  CheckInSearchResponse,
  PublicTicketResponse,
} from "../shared/types";
import type {
  RegistrationInput,
  AdminCreateInput,
  AttendeesQueryInput,
  AdminsQueryInput,
  CheckInScanInput,
  CheckInByRegistrationInput,
  UndoCheckInInput,
  WalkInRegistrationInput,
} from "../shared/schemas";

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = "UNKNOWN_ERROR") {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/**
 * Lightweight typed API fetcher configured with credentials: "include".
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(endpoint, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let errorMessage = "An error occurred. Please try again.";
    let errorCode = `HTTP_${res.status}`;

    try {
      const data = await res.json();
      if (data?.error?.message) {
        errorMessage = data.error.message;
        errorCode = data.error.code || errorCode;
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }

    throw new ApiError(errorMessage, errorCode);
  }

  return (await res.json()) as T;
}

/**
 * Public registration submission.
 */
export async function registerAttendee(
  input: RegistrationInput,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Better Auth credentials login with rememberMe: true.
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ user: unknown; session: unknown }> {
  return apiFetch<{ user: unknown; session: unknown }>("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      rememberMe: true,
    }),
  });
}

/**
 * Better Auth sign-out.
 */
export async function logout(): Promise<{ success: boolean }> {
  try {
    return await apiFetch<{ success: boolean }>("/api/auth/sign-out", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch {
    return { success: true };
  }
}

/**
 * Check active admin session from server.
 */
export async function getAdminMe(): Promise<AdminMeResponse> {
  return apiFetch<AdminMeResponse>("/api/admin/me");
}

/**
 * Query attendee registrations with search, filter, sorting, and pagination.
 */
export async function getAttendees(
  params: AttendeesQueryInput = {
    search: "",
    attendeeType: "all",
    range: "all",
    sort: "newest",
    checkInStatus: "all",
    checkInDay: 1,
    page: 1,
    pageSize: 10,
  },
): Promise<AttendeesResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.attendeeType && params.attendeeType !== "all") {
    query.set("attendeeType", params.attendeeType);
  }
  if (params.range && params.range !== "all") {
    query.set("range", params.range);
  }
  if (params.sort) query.set("sort", params.sort);
  if (params.checkInStatus && params.checkInStatus !== "all") {
    query.set("checkInStatus", params.checkInStatus);
  }
  if (params.checkInDay) {
    query.set("checkInDay", params.checkInDay.toString());
  }
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());

  const qs = query.toString();
  return apiFetch<AttendeesResponse>(`/api/admin/attendees${qs ? `?${qs}` : ""}`);
}

/**
 * Query administrator accounts.
 */
export async function getAdmins(
  params: AdminsQueryInput = {
    search: "",
    status: "all",
    page: 1,
    pageSize: 10,
  },
): Promise<AdminsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());

  const qs = query.toString();
  return apiFetch<AdminsResponse>(`/api/admin/admins${qs ? `?${qs}` : ""}`);
}

/**
 * Create a new administrator account.
 */
export async function createAdmin(
  input: AdminCreateInput,
): Promise<{ email: string; password: string }> {
  return apiFetch<{ email: string; password: string }>("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Enable or disable an administrator account.
 */
export async function updateAdminStatus(
  id: string,
  status: AdminStatus,
): Promise<{ ok: boolean; status: AdminStatus }> {
  return apiFetch<{ ok: boolean; status: AdminStatus }>(
    `/api/admin/admins/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

/**
 * Check-in by QR code or manual ticket code.
 */
export async function checkInScan(
  input: CheckInScanInput,
): Promise<CheckInResponse> {
  return apiFetch<CheckInResponse>("/api/admin/check-in", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Manual check-in by registration ID.
 */
export async function checkInByRegistration(
  input: CheckInByRegistrationInput,
): Promise<CheckInResponse> {
  return apiFetch<CheckInResponse>("/api/admin/check-in/by-registration", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Undo an accidental or mistaken check-in.
 */
export async function undoCheckIn(
  input: UndoCheckInInput,
): Promise<{ ok: boolean; undone: boolean }> {
  return apiFetch<{ ok: boolean; undone: boolean }>("/api/admin/check-in", {
    method: "DELETE",
    body: JSON.stringify(input),
  });
}

/**
 * Search attendees for check-in by query term.
 */
export async function searchCheckInAttendees(
  q: string,
  day: number,
): Promise<CheckInSearchResponse> {
  const query = new URLSearchParams({
    q,
    day: day.toString(),
  });
  return apiFetch<CheckInSearchResponse>(`/api/admin/check-in/search?${query.toString()}`);
}

/**
 * Get check-in statistics and progress for selected day.
 */
export async function getCheckInStats(
  day: number,
): Promise<CheckInStatsResponse> {
  return apiFetch<CheckInStatsResponse>(`/api/admin/check-in/stats?day=${day}`);
}

/**
 * Register a walk-in attendee and check them in directly.
 */
export async function registerWalkIn(
  input: WalkInRegistrationInput,
): Promise<CheckInResponse> {
  return apiFetch<CheckInResponse>("/api/admin/check-in/walk-in", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Resend confirmation email to an attendee.
 */
export async function resendAttendeeEmail(
  attendeeId: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/admin/attendees/${attendeeId}/resend-email`, {
    method: "POST",
  });
}

/**
 * Get public ticket by ticket code.
 */
export async function getPublicTicket(
  code: string,
): Promise<PublicTicketResponse> {
  return apiFetch<PublicTicketResponse>(`/api/tickets/${encodeURIComponent(code)}`);
}
