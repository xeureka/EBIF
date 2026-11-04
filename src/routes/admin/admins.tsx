import { createFileRoute } from "@tanstack/react-router";
import { AdminsPage } from "@/features/admin/admins/AdminsPage";

export const Route = createFileRoute("/admin/admins")({
  component: AdminsPage,
});
