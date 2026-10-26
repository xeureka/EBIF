import { createFileRoute } from "@tanstack/react-router";
import { GalaSite } from "@/components/gala/site";

export const Route = createFileRoute("/")({ component: GalaSite });
