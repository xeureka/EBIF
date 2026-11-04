-- Migration 0002: Add unique index and NOT NULL constraint to ticket_code
-- NOTE: Apply only after backfill has run and the new code is deployed to production.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_ticket_code_unique ON public."registrations" (ticket_code);
ALTER TABLE public."registrations" ALTER COLUMN ticket_code SET NOT NULL;
