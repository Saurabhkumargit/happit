import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  ChartNoAxesCombined,
  ChartNoAxesColumnIncreasing,
  History,
  Home,
  House,
  ListChecks,
  LogOut,
} from "lucide-react";

import "./AppShell.css";

interface AppShellProps {
  userEmail: string;
  onLogout: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  logoutError: string | null;
  deleteError?: string | null;
  isDeleting?: boolean;
}

interface SidebarLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}

function SidebarLink({
  to,
  icon,
  label,
  end = false,
}: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive
          ? "app-sidebar-link active"
          : "app-sidebar-link"
      }
    >
      <span className="app-sidebar-icon">
        {icon}
      </span>

      <span className="app-sidebar-label">
        {label}
      </span>
    </NavLink>
  );
}

function AppShell({
  userEmail,
  onLogout,
  logoutError,
}: AppShellProps) {
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <header className="app-mobile-header">
        <button
          type="button"
          className="app-mobile-brand"
          onClick={() => navigate("/app")}
          aria-label="Go to Home"
        >
          <img
            src="/happit%20logo.png"
            alt="Happit"
            className="app-brand-mark"
          />

          <span>Happit</span>
        </button>

        <div className="app-mobile-account" ref={accountMenuRef}>
          <button
            type="button"
            className="app-mobile-avatar"
            aria-label="Account menu"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="true"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>

          {isAccountMenuOpen && (
            <div
              className="app-mobile-account-menu"
              aria-label="Account menu"
            >
              <div className="app-mobile-account-identity">
                <div className="app-avatar">
                  {userEmail.charAt(0).toUpperCase()}
                </div>

                <div className="app-account-info">
                  <span className="app-account-label">
                    Signed in as
                  </span>

                  <span className="app-account-email">
                    {userEmail}
                  </span>
                </div>
              </div>

              {logoutError && (
                <p className="app-error" role="alert">
                  {logoutError}
                </p>
              )}

              <button
                type="button"
                className="app-sidebar-action app-mobile-logout"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  void onLogout();
                }}
              >
                <LogOut size={17} aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <div className="app-sidebar-inner">
          <div className="app-brand">
            <button
              type="button"
              className="app-brand-button"
              onClick={() => navigate("/app")}
              aria-label="Go to Home"
            >
              <img
                src="/happit%20logo.png"
                alt="Happit"
                className="app-brand-mark"
              />

              <span className="app-brand-name">
                Happit
              </span>
            </button>
          </div>

          <nav
            aria-label="Primary navigation"
            className="app-sidebar-nav"
          >
            <SidebarLink
              to="/app"
              end
              icon={<Home size={18} />}
              label="Home"
            />

            <SidebarLink
              to="/app/habits"
              icon={<ListChecks size={18} />}
              label="Habits"
            />

            <SidebarLink
              to="/app/progress"
              icon={
                <ChartNoAxesCombined size={18} />
              }
              label="Progress"
            />

            <SidebarLink
              to="/app/activities"
              icon={<Activity size={18} />}
              label="History"
            />
          </nav>

          <div className="app-sidebar-bottom">
            <div className="app-sidebar-account">
              <div className="app-avatar">
                {userEmail.charAt(0).toUpperCase()}
              </div>

              <div className="app-account-info">
                <span className="app-account-label">
                  Signed in as
                </span>

                <span className="app-account-email">
                  {userEmail}
                </span>
              </div>
            </div>

            {logoutError && (
              <p
                className="app-error"
                role="alert"
              >
                {logoutError}
              </p>
            )}

            <button
              type="button"
              className="app-sidebar-action"
              onClick={() => {
                void onLogout();
              }}
            >
              <LogOut
                size={17}
                aria-hidden="true"
              />

              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile floating navigation */}
      <nav
        className="mobile-bottom-nav"
        aria-label="Primary navigation"
      >
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            `mobile-bottom-nav-item ${
              isActive ? "active" : ""
            }`
          }
          aria-label="Home"
        >
          <House
            size={21}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </NavLink>

        <NavLink
          to="/app/habits"
          className={({ isActive }) =>
            `mobile-bottom-nav-item ${
              isActive ? "active" : ""
            }`
          }
          aria-label="Habits"
        >
          <ListChecks
            size={21}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </NavLink>

        <NavLink
          to="/app/progress"
          className={({ isActive }) =>
            `mobile-bottom-nav-item ${
              isActive ? "active" : ""
            }`
          }
          aria-label="Progress"
        >
          <ChartNoAxesColumnIncreasing
            size={21}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </NavLink>

        <NavLink
          to="/app/activities"
          className={({ isActive }) =>
            `mobile-bottom-nav-item ${
              isActive ? "active" : ""
            }`
          }
          aria-label="History"
        >
          <History
            size={21}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </NavLink>
      </nav>
    </div>
  );
}

export default AppShell;