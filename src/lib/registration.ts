import { registerAttendee } from "./api";
import type { AttendeeType as SharedAttendeeType } from "../shared/types";

export type AttendeeType =
  | "Company"
  | "Investor"
  | "Government Institution"
  | "International Partner";

export type RegistrationPayload = {
  name: string;
  organisation: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: AttendeeType;
  attendeeType: AttendeeType;
  note: string;
  consent: boolean;
};

const MAP_TYPE_TO_SHARED: Record<AttendeeType, SharedAttendeeType> = {
  Company: "company",
  Investor: "investor",
  "Government Institution": "government",
  "International Partner": "international_partner",
};

export async function submitRegistration(payload: RegistrationPayload): Promise<{ ok: boolean; ticketCode?: string }> {
  // Extract 9 digits from phone number
  const rawDigits = payload.phone.replace(/\D/g, "");
  const cleanPhone = rawDigits.startsWith("251") ? rawDigits.slice(3) : rawDigits;

  const sharedType = MAP_TYPE_TO_SHARED[payload.attendeeType] || "company";

  return await registerAttendee({
    fullName: payload.name.trim(),
    email: payload.email.trim(),
    phone: cleanPhone,
    organization: payload.organisation.trim(),
    jobTitle: payload.jobTitle.trim(),
    attendeeType: sharedType,
    consent: true,
  });
}
