import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  ChartNoAxesCombined,
  BookOpen,
  ListChecks,
  LogOut,
  Trash2,
} from "lucide-react";

interface AppShellProps {
  userEmail: string;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  logoutError: string | null;
  deleteError: string | null;
  isDeleting: boolean;
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

  function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    void onDeleteAccount();
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <button
            type="button"
            className="app-brand-button"
            onClick={() => navigate("/app/habits")}
          >
            Happit
          </button>
        </div>

        <nav aria-label="Primary navigation" className="app-nav">
          <div className="app-nav-section">
            <NavLink
              to="/app/habits"
              className={({ isActive }) =>
                isActive ? "app-nav-link active" : "app-nav-link"
              }
            >
              <ListChecks aria-hidden="true" size={18} />
              <span>Habits</span>
            </NavLink>

            <div className="app-nav-subsection">
              <NavLink
                to="/app/habits/catalog"
                className={({ isActive }) =>
                  isActive ? "app-nav-sublink active" : "app-nav-sublink"
                }
              >
                <BookOpen aria-hidden="true" size={16} />
                <span>Habit catalog</span>
              </NavLink>

              <NavLink
                to="/app/habits/archived"
                className={({ isActive }) =>
                  isActive ? "app-nav-sublink active" : "app-nav-sublink"
                }
              >
                <Archive aria-hidden="true" size={16} />
                <span>Archived</span>
              </NavLink>
            </div>
          </div>

          <NavLink
            to="/app/activities"
            className={({ isActive }) =>
              isActive ? "app-nav-link active" : "app-nav-link"
            }
          >
            <Activity aria-hidden="true" size={18} />
            <span>Activity</span>
          </NavLink>

          <NavLink
            to="/app/progress"
            className={({ isActive }) =>
              isActive ? "app-nav-link active" : "app-nav-link"
            }
          >
            <ChartNoAxesCombined aria-hidden="true" size={18} />
            <span>Progress</span>
          </NavLink>
        </nav>

        <div className="app-sidebar-footer">
          <p className="app-user-email">{userEmail}</p>

          {logoutError && (
            <p className="app-error" role="alert">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            className="app-secondary-button"
            onClick={() => void onLogout()}
          >
            <LogOut aria-hidden="true" size={16} />
            <span>Log out</span>
          </button>

          {deleteError && (
            <p className="app-error" role="alert">
              {deleteError}
            </p>
          )}

          <button
            type="button"
            className="app-danger-button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
          >
            <Trash2 aria-hidden="true" size={16} />
            <span>{isDeleting ? "Deleting account..." : "Delete account"}</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-mobile-header">
          <button
            type="button"
            className="app-brand-button"
            onClick={() => navigate("/app/habits")}
          >
            Happit
          </button>

          <span className="app-mobile-user">{userEmail}</span>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="app-bottom-nav">
        <NavLink
          to="/app/habits"
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <ListChecks aria-hidden="true" size={20} />
          <span>Habits</span>
        </NavLink>

        <NavLink
          to="/app/activities"
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <Activity aria-hidden="true" size={20} />
          <span>Activity</span>
        </NavLink>

        <NavLink
          to="/app/progress"
          className={({ isActive }) =>
            isActive ? "app-bottom-link active" : "app-bottom-link"
          }
        >
          <ChartNoAxesCombined aria-hidden="true" size={20} />
          <span>Progress</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default AppShell;
