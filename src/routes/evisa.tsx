import { createFileRoute } from "@tanstack/react-router";
import { VisaPage } from "@/features/visa/VisaPage";

export const Route = createFileRoute("/evisa")({
  component: VisaPage,
});
