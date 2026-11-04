import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { RegistrationModalProvider } from "@/components/registration/RegistrationModalProvider";

export const Route = createRootRoute({
  component: () => (
    <RegistrationModalProvider>
      <Outlet />
      <Toaster richColors position="top-right" theme="dark" />
    </RegistrationModalProvider>
  ),
});
