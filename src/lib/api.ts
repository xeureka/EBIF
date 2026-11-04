import type {
  AttendeesResponse,
  AdminsResponse,
  AdminMeResponse,
  AdminStatus,
} from "../shared/types";
import type {
  RegistrationInput,
  AdminCreateInput,
  AttendeesQueryInput,
  AdminsQueryInput,
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
