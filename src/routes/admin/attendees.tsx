import { createFileRoute } from "@tanstack/react-router";
import { AttendeesPage } from "@/features/admin/attendees/AttendeesPage";

export const Route = createFileRoute("/admin/attendees")({
  component: AttendeesPage,
});
