import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  BookOpen,
  ChartNoAxesCombined,
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

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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
      {/* Desktop Sidebar */}
      <aside
        className={`app-sidebar ${sidebarExpanded ? "expanded" : "collapsed"}`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="app-sidebar-inner">
          {/* Brand */}
          <div className="app-brand">
            <button
              type="button"
              className="app-brand-button"
              onClick={() => navigate("/app/habits")}
              aria-label="Go to habits"
            >
              <img
                src="/happit%20logo.png"
                alt="Happit"
                className="app-brand-mark"
              />

              <span className="app-brand-name">Happit</span>
            </button>
          </div>

          {/* Main navigation */}
          <nav aria-label="Primary navigation" className="app-sidebar-nav">
            <div className="app-sidebar-section">
              <SidebarLink
                to="/app/habits"
                end
                icon={<ListChecks size={18} />}
                label="Habits"
              />

              <div className="app-sidebar-subnav">
                <SidebarLink
                  to="/app/habits/catalog"
                  icon={<BookOpen size={16} />}
                  label="Habit catalog"
                />

                <SidebarLink
                  to="/app/habits/archived"
                  icon={<Archive size={16} />}
                  label="Archived"
                />
              </div>
            </div>

            <SidebarLink
              to="/app/activities"
              icon={<Activity size={18} />}
              label="Activity"
            />

            <SidebarLink
              to="/app/progress"
              icon={<ChartNoAxesCombined size={18} />}
              label="Progress"
            />
          </nav>

          {/* Bottom section */}
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
              onClick={() => void onLogout()}
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
              onClick={handleDeleteAccount}
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

      {/* Mobile top bar */}
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
          onClick={() => navigate("/app/habits")}
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

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div
          className="app-mobile-overlay"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-mobile-sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="app-mobile-sidebar-header">
          <button
            type="button"
            className="app-mobile-brand"
            onClick={() => {
              navigate("/app/habits");
              closeMobileSidebar();
            }}
          >
            <img
              src="/happit%20logo.png"
              alt="Happit"
              className="app-brand-mark"
            />
            <span>Happit</span>
          </button>

          <button
            type="button"
            className="app-mobile-close"
            onClick={closeMobileSidebar}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-mobile-nav">
          <SidebarLink
            to="/app/habits"
            end
            icon={<ListChecks size={18} />}
            label="Habits"
            onClick={closeMobileSidebar}
          />

          <div className="app-mobile-subnav">
            <SidebarLink
              to="/app/habits/catalog"
              icon={<BookOpen size={16} />}
              label="Habit catalog"
              onClick={closeMobileSidebar}
            />

            <SidebarLink
              to="/app/habits/archived"
              icon={<Archive size={16} />}
              label="Archived"
              onClick={closeMobileSidebar}
            />
          </div>

          <SidebarLink
            to="/app/activities"
            icon={<Activity size={18} />}
            label="Activity"
            onClick={closeMobileSidebar}
          />

          <SidebarLink
            to="/app/progress"
            icon={<ChartNoAxesCombined size={18} />}
            label="Progress"
            onClick={closeMobileSidebar}
          />
        </nav>

        <div className="app-mobile-sidebar-bottom">
          <div className="app-sidebar-account">
            <div className="app-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>

            <div className="app-account-info">
              <span className="app-account-label">Signed in as</span>
              <span className="app-account-email">{userEmail}</span>
            </div>
          </div>

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
            <span>{isDeleting ? "Deleting account..." : "Delete account"}</span>
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Mobile navigation" className="app-bottom-nav">
        <NavLink
          to="/app/habits"
          end
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <ListChecks size={20} aria-hidden="true" />
          <span>Habits</span>
        </NavLink>

        <NavLink
          to="/app/activities"
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <Activity size={20} aria-hidden="true" />
          <span>Activity</span>
        </NavLink>

        <NavLink
          to="/app/progress"
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <ChartNoAxesCombined size={20} aria-hidden="true" />
          <span>Progress</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default AppShell;
