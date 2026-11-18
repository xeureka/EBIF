import * as XLSX from "xlsx";
import type { AppDb } from "../../../db/client";
import { formatTicketCode } from "../../tickets/code";
import {
  ATTENDEE_EXPORT_COLUMNS,
  type AttendeeExportRow,
} from "./attendee-columns";
import { getExportFilename } from "./date";
import { getRegistrationsForDate } from "./repository";

function protectCellValue(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function toExportRows(rows: Awaited<ReturnType<typeof getRegistrationsForDate>>): AttendeeExportRow[] {
  return rows.map((row) => ({
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    jobTitle: row.jobTitle,
    attendeeType: row.attendeeType,
    ticketCode: row.ticketCode ? formatTicketCode(row.ticketCode) : "",
    reference: row.reference,
    registeredAt: row.createdAt.toISOString(),
    day1CheckedIn: row.day1CheckedIn ? "Yes" : "No",
    day2CheckedIn: row.day2CheckedIn ? "Yes" : "No",
  }));
}

function buildWorksheet(rows: AttendeeExportRow[]): XLSX.WorkSheet {
  const values = [
    ATTENDEE_EXPORT_COLUMNS.map((column) => column.header),
    ...rows.map((row) =>
      ATTENDEE_EXPORT_COLUMNS.map((column) => protectCellValue(String(row[column.key] ?? ""))),
    ),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  worksheet["!cols"] = ATTENDEE_EXPORT_COLUMNS.map((column) => ({ wch: column.width }));
  worksheet["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(ATTENDEE_EXPORT_COLUMNS.length - 1)}${values.length}`,
  };
  worksheet["!freeze"] = { rows: 1 };
  return worksheet;
}

export async function buildAttendeeExport(db: AppDb, date: string) {
  const rows = toExportRows(await getRegistrationsForDate(db, date));
  const worksheet = buildWorksheet(rows);

  try {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees");
    const body = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return {
      body: new Uint8Array(body),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: getExportFilename(date),
      rowCount: rows.length,
    };
  } catch (error) {
    console.error("Excel export failed; falling back to CSV:", error);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      body: new TextEncoder().encode(csv),
      contentType: "text/csv; charset=utf-8",
      filename: getExportFilename(date, "csv"),
      rowCount: rows.length,
    };
  }
}
