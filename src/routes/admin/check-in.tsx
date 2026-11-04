import { createFileRoute } from "@tanstack/react-router";
import { CheckInPage } from "@/features/admin/checkin/CheckInPage";

export const Route = createFileRoute("/admin/check-in")({
  component: CheckInPage,
});
