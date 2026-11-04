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
}

export interface AttendeeStats {
  total: number;
  today: number;
  company: number;
  investor: number;
  government: number;
  internationalPartner: number;
}

export interface AttendeesResponse {
  items: AttendeeItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: AttendeeStats;
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
