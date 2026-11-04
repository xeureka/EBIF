export const event = {
  name: "Ethiopian Business & Investment Forum",
  dates: "28–29 November 2026",
  dateLabel: "NOVEMBER 28 - 29",
  shortDates: "Nov 28–29, 2026",
  year: "2026",
  venue: "Adwa Victory Memorial Museum",
  city: "Addis Ababa",
  venueWithCity: "Adwa Victory Memorial Museum, Addis Ababa",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Adwa+Victory+Memorial+Museum+Addis+Ababa",
  phones: ["0911984806", "0911343831"],
  emails: ["feven.negussie@nexabusinessgroup.com", "zekre.henock@nexabusinessgroup.com"],
  timeZone: "Africa/Addis_Ababa",
  days: [
    { day: 1, date: "2026-11-28", label: "Day 1 — Nov 28, 2026" },
    { day: 2, date: "2026-11-29", label: "Day 2 — Nov 29, 2026" },
  ] as const,
} as const;

/**
 * Returns 1 or 2 if today in Africa/Addis_Ababa is Nov 28 or Nov 29, 2026.
 * Otherwise returns 1 by default.
 */
export function getCurrentEventDay(): 1 | 2 {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: event.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date()); // YYYY-MM-DD
    if (todayStr === "2026-11-28") return 1;
    if (todayStr === "2026-11-29") return 2;
  } catch {
    // Fallback to day 1
  }
  return 1;
}
