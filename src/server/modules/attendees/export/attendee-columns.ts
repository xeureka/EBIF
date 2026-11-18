export type AttendeeExportRow = {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  attendeeType: string;
  ticketCode: string;
  reference: string;
  registeredAt: string;
  day1CheckedIn: string;
  day2CheckedIn: string;
};

export type AttendeeExportColumn = {
  header: string;
  key: keyof AttendeeExportRow;
  width: number;
};

export const ATTENDEE_EXPORT_COLUMNS: readonly AttendeeExportColumn[] = [
  { header: "Full Name", key: "fullName", width: 24 },
  { header: "Email", key: "email", width: 32 },
  { header: "Phone", key: "phone", width: 18 },
  { header: "Organization", key: "organization", width: 28 },
  { header: "Job Title", key: "jobTitle", width: 24 },
  { header: "Attendee Type", key: "attendeeType", width: 24 },
  { header: "Ticket Code", key: "ticketCode", width: 18 },
  { header: "Reference", key: "reference", width: 18 },
  { header: "Registered At", key: "registeredAt", width: 24 },
  { header: "Day 1", key: "day1CheckedIn", width: 16 },
  { header: "Day 2", key: "day2CheckedIn", width: 16 },
];
