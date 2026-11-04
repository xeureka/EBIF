import { z } from "zod";

export const ATTENDEE_TYPES = [
  "company",
  "investor",
  "government",
  "international_partner",
] as const;

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name must be under 120 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^[97]\d{8}$/, "Phone must be 9 digits starting with 9 or 7"),
  organization: z
    .string()
    .trim()
    .min(1, "Organization is required")
    .max(120, "Organization must be under 120 characters"),
  jobTitle: z
    .string()
    .trim()
    .min(1, "Job title is required")
    .max(120, "Job title must be under 120 characters"),
  attendeeType: z.enum(ATTENDEE_TYPES, {
    message: "Please select a valid attendee type",
  }),
  consent: z.literal(true, {
    message: "You must agree to continue",
  }),
  honeypot: z.string().optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const adminCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9._]+$/,
      "Username may only contain letters, numbers, dots, and underscores",
    ),
});

export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

export const adminStatusSchema = z.object({
  status: z.enum(["active", "disabled"], {
    message: "Status must be either 'active' or 'disabled'",
  }),
});

export type AdminStatusInput = z.infer<typeof adminStatusSchema>;

export const attendeesQuerySchema = z.object({
  search: z.string().optional().default(""),
  attendeeType: z.enum(["all", ...ATTENDEE_TYPES]).optional().default("all"),
  range: z.enum(["all", "today", "7d", "30d"]).optional().default("all"),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type AttendeesQueryInput = z.infer<typeof attendeesQuerySchema>;

export const adminsQuerySchema = z.object({
  search: z.string().optional().default(""),
  status: z.enum(["all", "active", "disabled"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type AdminsQueryInput = z.infer<typeof adminsQuerySchema>;
