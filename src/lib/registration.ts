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

export async function submitRegistration(payload: RegistrationPayload): Promise<void> {
  void payload;
  await new Promise((resolve) => window.setTimeout(resolve, 500));
}
