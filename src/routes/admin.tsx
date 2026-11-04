import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { getAdminMe } from "@/lib/api";
import { AdminLayout } from "@/features/admin/components/AdminLayout";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const isLogin = location.pathname === "/admin/login";
    let authed = false;

    try {
      const me = await getAdminMe();
      authed = !!me && me.status === "active";
    } catch {
      authed = false;
    }

    // If authenticated user visits /admin/login, redirect to /admin/attendees
    if (isLogin) {
      if (authed) {
        throw redirect({ to: "/admin/attendees" });
      }
      return;
    }

    // Protect all other /admin routes: if not authenticated, redirect immediately to /admin/login
    if (!authed) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  const location = useLocation();

  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
