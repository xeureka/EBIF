import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/admin/auth/LoginPage";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});
