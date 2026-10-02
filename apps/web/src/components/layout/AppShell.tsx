import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  ChartNoAxesCombined,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Trash2,
  X,
} from "lucide-react";

import "./AppShell.css";

interface AppShellProps {
  userEmail: string;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  logoutError: string | null;
  deleteError: string | null;
  isDeleting: boolean;
}

interface SidebarLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  onClick?: () => void;
}

function SidebarLink({
  to,
  icon,
  label,
  end = false,
  onClick,
}: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        isActive ? "app-sidebar-link active" : "app-sidebar-link"
      }
    >
      <span className="app-sidebar-icon">{icon}</span>
      <span className="app-sidebar-label">{label}</span>
    </NavLink>
  );
}

function AppShell({
  userEmail,
  onLogout,
  onDeleteAccount,
  logoutError,
  deleteError,
  isDeleting,
}: AppShellProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    void onDeleteAccount();
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="app-mobile-overlay"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile header */}
      <header className="app-mobile-header">
        <button
          type="button"
          className="app-mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu size={21} />
        </button>

        <button
          type="button"
          className="app-mobile-brand"
          onClick={() => navigate("/app")}
        >
          <img
            src="/happit%20logo.png"
            alt="Happit"
            className="app-brand-mark"
          />

          <span>Happit</span>
        </button>

        <div className="app-mobile-avatar">
          {userEmail.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Sidebar - Single source of truth for navigation & account */}
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="app-sidebar-inner">
          <div className="app-brand">
            <button
              type="button"
              className="app-brand-button"
              onClick={() => {
                navigate("/app");
                closeMobileSidebar();
              }}
              aria-label="Go to Home"
            >
              <img
                src="/happit%20logo.png"
                alt="Happit"
                className="app-brand-mark"
              />

              <span className="app-brand-name">Happit</span>
            </button>

            <button
              type="button"
              className="app-mobile-close app-sidebar-close"
              onClick={closeMobileSidebar}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          <nav aria-label="Primary navigation" className="app-sidebar-nav">
            <SidebarLink
              to="/app"
              end
              icon={<Home size={18} />}
              label="Home"
              onClick={closeMobileSidebar}
            />

            <SidebarLink
              to="/app/habits"
              icon={<ListChecks size={18} />}
              label="Habits"
              onClick={closeMobileSidebar}
            />

            <SidebarLink
              to="/app/progress"
              icon={<ChartNoAxesCombined size={18} />}
              label="Progress"
              onClick={closeMobileSidebar}
            />

            <SidebarLink
              to="/app/activities"
              icon={<Activity size={18} />}
              label="History"
              onClick={closeMobileSidebar}
            />
          </nav>

          <div className="app-sidebar-bottom">
            <div className="app-sidebar-account">
              <div className="app-avatar">
                {userEmail.charAt(0).toUpperCase()}
              </div>

              <div className="app-account-info">
                <span className="app-account-label">Signed in as</span>
                <span className="app-account-email">{userEmail}</span>
              </div>
            </div>

            {logoutError && (
              <p className="app-error" role="alert">
                {logoutError}
              </p>
            )}

            <button
              type="button"
              className="app-sidebar-action"
              onClick={() => {
                closeMobileSidebar();
                void onLogout();
              }}
            >
              <LogOut size={17} aria-hidden="true" />
              <span>Log out</span>
            </button>

            {deleteError && (
              <p className="app-error" role="alert">
                {deleteError}
              </p>
            )}

            <button
              type="button"
              className="app-sidebar-action danger"
              onClick={() => {
                closeMobileSidebar();
                handleDeleteAccount();
              }}
              disabled={isDeleting}
            >
              <Trash2 size={17} aria-hidden="true" />
              <span>
                {isDeleting ? "Deleting account..." : "Delete account"}
              </span>
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
    </div>
  );
}

export default AppShell;