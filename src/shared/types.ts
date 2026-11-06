export type AttendeeType = "company" | "investor" | "government" | "international_partner";

export type AdminStatus = "active" | "disabled";

export interface AttendeeItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  attendeeType: AttendeeType;
  attendingDays: string;
  createdAt: string;
  reference: string;
  ticketCode?: string | null;
  day1CheckedIn?: boolean;
  day2CheckedIn?: boolean;
  emailStatus?: "sent" | "failed";
  emailError?: string | null;
}

export interface AttendeeStats {
  total: number;
  today: number;
  company: number;
  investor: number;
  government: number;
  internationalPartner: number;
  checkedInToday?: number;
}

export interface AttendeesResponse {
  items: AttendeeItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: AttendeeStats;
}

export interface CheckInRegistrationDetails {
  id: string;
  fullName: string;
  organization: string;
  jobTitle: string;
  attendeeType: string;
  ticketCode: string;
  checkedInAt: string;
  checkedInBy: string;
  method?: "qr" | "manual" | "walk_in";
}

export interface CheckInResponse {
  ok: boolean;
  status: "checked_in" | "already_checked_in" | "not_found";
  registration?: CheckInRegistrationDetails;
}

export interface CheckInStatsData {
  day: number;
  total: number;
  checkedIn: number;
  byType: Record<string, { total: number; checkedIn: number }>;
}

export interface CheckInStatsResponse {
  ok: boolean;
  stats: CheckInStatsData;
}

export interface CheckInSearchAttendeeItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  attendeeType: string;
  ticketCode: string | null;
  reference: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  method: string | null;
}

export interface CheckInSearchResponse {
  ok: boolean;
  items: CheckInSearchAttendeeItem[];
}

export interface PublicTicketResponse {
  ok: boolean;
  ticket: {
    eventName: string;
    dates: string;
    venue: string;
    attendeeName: string;
    attendeeType: string;
    ticketCode: string;
  };
}

export interface AdminItem {
  id: string;
  username: string;
  email: string;
  status: AdminStatus;
  role: string;
  createdAt: string;
  createdBy?: string;
}

export interface AdminsResponse {
  items: AdminItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMeResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  status: AdminStatus;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
