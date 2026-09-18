import { useEffect, useState } from "react";
import "./App.css";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  deleteAccount,
  getCurrentUser,
  logout,
  type User,
} from "./services/api";
import { broadcastAuthEvent, createAuthChannel } from "./services/authChannel";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import HabitList from "./components/habits/HabitList";
import HabitCatalog from "./components/habits/HabitCatalog";
import ArchivedHabitList from "./components/habits/ArchivedHabitList";
import HabitDetail from "./components/habits/HabitDetail";
import ActivityHistory from "./components/activities/ActivityHistory";
import ManualActivityForm from "./components/activities/ManualActivityForm";
import TimerActivityForm from "./components/activities/TimerActivityForm";
import ActivityDetail from "./components/activities/ActivityDetail";
import AppShell from "./components/layout/AppShell";
import Progress from "./components/progress/Progress";

type AuthMode = "login" | "register";

function HabitDetailRoute() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();

  if (!habitId) {
    return <Navigate to="/app/habits" replace />;
  }

  return (
    <HabitDetail
      habitId={habitId}
      onArchived={() => navigate("/app/habits/archived")}
    />
  );
}

function ActivityDetailRoute() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();

  if (!activityId) {
    return <Navigate to="/app/activities" replace />;
  }

  return (
    <ActivityDetail
      activityId={activityId}
      onDeleted={() => navigate("/app/activities")}
    />
  );
}

function AuthenticatedApp({
  user,
  onLogout,
  logoutError,
  onDeleteAccount,
  deleteError,
  isDeleting,
}: {
  user: User;
  onLogout: () => Promise<void>;
  logoutError: string | null;
  onDeleteAccount: () => Promise<void>;
  deleteError: string | null;
  isDeleting: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell
            userEmail={user.email}
            onLogout={onLogout}
            onDeleteAccount={onDeleteAccount}
            logoutError={logoutError}
            deleteError={deleteError}
            isDeleting={isDeleting}
          />
        }
      >
        <Route
          index
          element={<Navigate to="/app/habits" replace />}
        />

        <Route
          path="app/habits"
          element={
            <HabitList
              onSelectHabit={(habitId) =>
                navigate(`/app/habits/${habitId}`)
              }
            />
          }
        />

        <Route
          path="app/habits/catalog"
          element={<HabitCatalog />}
        />

        <Route
          path="app/habits/archived"
          element={<ArchivedHabitList />}
        />

        <Route
          path="app/habits/:habitId"
          element={<HabitDetailRoute />}
        />

        <Route
          path="app/activities"
          element={
            <ActivityHistory
              onSelectActivity={(activityId) =>
                navigate(`/app/activities/${activityId}`)
              }
            />
          }
        />

        <Route
          path="app/activities/timer"
          element={
            <TimerActivityForm
              onSaved={() => navigate("/app/activities")}
            />
          }
        />

        <Route
          path="app/activities/new"
          element={
            <ManualActivityForm
              onSaved={() => navigate("/app/activities")}
            />
          }
        />

        <Route
          path="app/activities/:activityId"
          element={<ActivityDetailRoute />}
        />

        <Route path="app/progress" element={<Progress />} />

        <Route
          path="*"
          element={<Navigate to="/app/habits" replace />}
        />
      </Route>
    </Routes>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const result = await getCurrentUser();
        setUser(result.user);
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    const channel = createAuthChannel();

    if (!channel) {
      return;
    }

    channel.onmessage = (event) => {
      if (event.data === "LOGGED_OUT" || event.data === "ACCOUNT_DELETED") {
        setUser(null);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  async function handleLogout() {
    setLogoutError(null);

    try {
      await logout();
      setUser(null);
      broadcastAuthEvent("LOGGED_OUT");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out",
      );
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteAccount();
      setUser(null);
      broadcastAuthEvent("ACCOUNT_DELETED");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete account",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAuthSuccess() {
    try {
      const result = await getCurrentUser();
      setUser(result.user);
    } catch {
      setUser(null);
    }
  }

  if (!authChecked) {
    return (
      <main>
        <h1>Happit</h1>
        <p>Checking authentication...</p>
      </main>
    );
  }

  if (user) {
    return (
      <AuthenticatedApp
        user={user}
        onLogout={handleLogout}
        logoutError={logoutError}
        onDeleteAccount={handleDeleteAccount}
        deleteError={deleteError}
        isDeleting={isDeleting}
      />
    );
  }

  return (
    <main>
      <h1>Happit</h1>

      {authMode === "login" ? (
        <>
          <LoginForm onSuccess={handleAuthSuccess} />

          <p>
            Don't have an account?{" "}
            <button type="button" onClick={() => setAuthMode("register")}>
              Create one
            </button>
          </p>
        </>
      ) : (
        <>
          <RegisterForm onSuccess={handleAuthSuccess} />

          <p>
            Already have an account?{" "}
            <button type="button" onClick={() => setAuthMode("login")}>
              Log in
            </button>
          </p>
        </>
      )}
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
