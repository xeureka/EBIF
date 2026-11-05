import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, QrCode, Shield, Users, X } from "lucide-react";
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
    to: "/admin/check-in",
    label: "Check-in",
    icon: QrCode,
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  // Close mobile drawer and user menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
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
    if (location.pathname.startsWith("/admin/check-in")) {
      return {
        title: "Check-in",
        subtitle: "Fast QR code scanning and desk check-in for forum attendees.",
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
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center border border-line text-mute cursor-pointer touch-manipulation hover:text-cream"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-2 border-b border-line bg-ink/95 px-4 backdrop-blur-sm sm:px-8 min-w-0">
          {/* Left: Hamburger + Title */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="grid h-10 w-10 shrink-0 place-items-center border border-line text-cream md:hidden cursor-pointer touch-manipulation hover:bg-ink-2/60 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-medium text-cream sm:text-xl leading-tight">
                {pageMeta.title}
              </h1>
              <p className="hidden text-[11px] text-mute sm:block truncate">
                {pageMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Event Label (md+) + User Profile / Email area */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3 min-w-0">
            <p className="hidden md:block truncate max-w-[150px] lg:max-w-[260px] xl:max-w-none text-[10px] uppercase tracking-[0.2em] text-mute whitespace-nowrap">
              Ethiopian Business &amp; Investment Forum
            </p>

            <span className="hidden md:block h-4 w-px bg-line" aria-hidden="true" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User profile menu"
                className="flex items-center gap-2 border border-line bg-ink-2/40 p-1 md:px-2.5 md:py-1.5 transition-colors hover:border-gold/50 cursor-pointer touch-manipulation min-h-[40px] min-w-[40px]"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center border border-gold/40 bg-gold/15 text-xs font-semibold text-gold">
                  {getInitials(currentUser?.username || currentUser?.email)}
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="truncate max-w-[120px] lg:max-w-[180px] text-xs font-medium text-cream leading-tight">
                    {currentUser?.email || currentUser?.username || "admin@ebif.et"}
                  </p>
                  <p className="truncate text-[9px] uppercase tracking-[0.1em] text-mute">
                    {currentUser?.role === "admin" ? "Administrator" : currentUser?.role || "Administrator"}
                  </p>
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 top-full mt-2 z-50 w-60 border border-line bg-ink p-3 shadow-xl"
                    role="menu"
                  >
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-line">
                      <div className="grid h-9 w-9 shrink-0 place-items-center border border-gold/40 bg-gold/15 text-xs font-semibold text-gold">
                        {getInitials(currentUser?.username || currentUser?.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-cream break-all leading-tight">
                          {currentUser?.email || currentUser?.username || "admin@ebif.et"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-mute uppercase tracking-[0.1em]">
                          {currentUser?.role === "admin" ? "Administrator" : currentUser?.role || "Administrator"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-2 py-2 text-xs font-medium text-mute hover:bg-rose/10 hover:text-rose transition-colors cursor-pointer min-h-[40px]"
                      >
                        <LogOut size={14} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
