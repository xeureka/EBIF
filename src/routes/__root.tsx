import { createRootRoute, Outlet } from "@tanstack/react-router";
import { RegistrationModalProvider } from "@/components/registration/RegistrationModalProvider";

export const Route = createRootRoute({
  component: () => (
    <RegistrationModalProvider>
      <Outlet />
    </RegistrationModalProvider>
  ),
});
