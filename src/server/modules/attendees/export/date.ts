export const ATTENDEE_EXPORT_TIME_ZONE = "Africa/Addis_Ababa";
const ADDIS_ABABA_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getTodayInAddis(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDEE_EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getAddisDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDEE_EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function getAddisDayWindow(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - ADDIS_ABABA_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function listDatesNewestFirst(firstDate: string, today: string): string[] {
  const [firstYear, firstMonth, firstDay] = firstDate.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const first = Date.UTC(firstYear, firstMonth - 1, firstDay);
  const last = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const dates: string[] = [];

  for (let timestamp = last; timestamp >= first; timestamp -= 24 * 60 * 60 * 1000) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }

  return dates;
}

export function getExportFilename(date: string, extension: "xlsx" | "csv" = "xlsx"): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDEE_EXPORT_TIME_ZONE,
    month: "long",
    day: "numeric",
  }).format(getAddisDayWindow(date).start);

  const [month, day] = formatted.toLowerCase().split(" ");
  return `${month}_${day.replace(",", "")}.${extension}`;
}

export function getAllExportFilename(extension: "xlsx" | "csv" = "xlsx"): string {
  return `all_attendees.${extension}`;
}
