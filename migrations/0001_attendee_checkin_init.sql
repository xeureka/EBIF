-- Migration 0001: Attendee check-in and email log initialization
-- Add nullable ticket_code to registrations
ALTER TABLE public."registrations" ADD COLUMN IF NOT EXISTS ticket_code TEXT;

-- Create check_ins table
CREATE TABLE IF NOT EXISTS public."check_ins" (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES public."registrations"(id) ON DELETE CASCADE,
  event_day SMALLINT NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_by TEXT NOT NULL REFERENCES public."user"(id),
  method TEXT NOT NULL CHECK (method IN ('qr', 'manual', 'walk_in'))
);

CREATE UNIQUE INDEX IF NOT EXISTS check_ins_registration_day_unique ON public."check_ins" (registration_id, event_day);
CREATE INDEX IF NOT EXISTS check_ins_event_day_idx ON public."check_ins" (event_day);
CREATE INDEX IF NOT EXISTS check_ins_checked_in_at_idx ON public."check_ins" (checked_in_at);

-- Create email_log table
CREATE TABLE IF NOT EXISTS public."email_log" (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES public."registrations"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_registration_id_idx ON public."email_log" (registration_id);
CREATE INDEX IF NOT EXISTS email_log_created_at_idx ON public."email_log" (created_at);
