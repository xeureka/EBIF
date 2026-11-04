import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Shield, Users, X } from "lucide-react";
import { getAdminMe, logout } from "@/lib/api";
import type { AdminMeResponse } from "@/shared/types";

type AdminLayoutProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  {
    to: "/admin/attendees",
    label: "Attendees",
    icon: Users,
  },
  {
    to: "/admin/admins",
    label: "Admins",
    icon: Shield,
  },
] as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  const [currentUser, setCurrentUser] = useState<AdminMeResponse | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    getAdminMe()
      .then((data) => {
        if (active) setCurrentUser(data);
      })
      .catch(() => {
        if (active) navigate({ to: "/admin/login" });
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/admin/login" });
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith("/admin/admins")) {
      return {
        title: "Administrators",
        subtitle: "Manage administrator credentials and portal access privileges.",
      };
    }
    return {
      title: "Attendees",
      subtitle: "View and filter all registered participants for the Forum.",
    };
  };

  const pageMeta = getPageTitle();

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    const parts = name.split(/[._\s-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="border-b border-line p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
            Admin Portal
          </p>
          <p className="mt-1 font-display text-xl font-medium tracking-[0.04em] text-cream">
            EBIF 2026
          </p>
        </div>

        {/* Navigation items (exactly Attendees and Admins) */}
        <nav className="p-3 space-y-1" aria-label="Admin Navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 border px-3.5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? "border-gold/40 bg-gold/10 text-gold-2 font-semibold"
                    : "border-transparent text-mute hover:border-line hover:bg-ink-2/60 hover:text-cream"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={isActive ? "text-gold" : "text-mute"}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout at bottom */}
      <div className="border-t border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center border border-gold/40 bg-gold/15 text-xs font-semibold text-gold">
              {getInitials(currentUser?.username)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-cream">
                {currentUser?.username || "Administrator"}
              </p>
              <p className="truncate text-[10px] text-mute uppercase tracking-[0.1em]">
                {currentUser?.role === "admin" ? "Administrator" : currentUser?.role || "Administrator"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="grid h-8 w-8 shrink-0 place-items-center border border-line text-mute transition-colors hover:border-rose hover:text-rose cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper text-cream">
      {/* Desktop fixed sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-ink md:flex md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-shade/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="relative h-full w-72 max-w-[85vw] border-r border-line bg-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center border border-line text-mute cursor-pointer"
            >
              <X size={15} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-5 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="grid h-9 w-9 place-items-center border border-line md:hidden cursor-pointer"
            >
              <Menu size={16} />
            </button>
            <div>
              <h1 className="font-display text-lg font-medium text-cream sm:text-xl leading-tight">
                {pageMeta.title}
              </h1>
              <p className="hidden text-[11px] text-mute sm:block">
                {pageMeta.subtitle}
              </p>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-mute">
            Ethiopian Business &amp; Investment Forum
          </p>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
