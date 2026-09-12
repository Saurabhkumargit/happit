import { useEffect, useState } from "react";
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
    <main>
      <h1>Happit</h1>
      <p>Welcome, {user.email}</p>

      <nav aria-label="Habit navigation">
        <button type="button" onClick={() => navigate("/app/habits")}>
          My habits
        </button>

        <button type="button" onClick={() => navigate("/app/habits/catalog")}>
          Habit catalog
        </button>

        <button type="button" onClick={() => navigate("/app/habits/archived")}>
          Archived
        </button>
      </nav>

      <Routes>
        <Route
          path="/app/habits"
          element={
            <HabitList
              onSelectHabit={(habitId) =>
                navigate(`/app/habits/${habitId}`)
              }
            />
          }
        />

        <Route
          path="/app/habits/catalog"
          element={<HabitCatalog />}
        />

        <Route
          path="/app/habits/archived"
          element={<ArchivedHabitList />}
        />

        <Route
          path="/app/habits/:habitId"
          element={<HabitDetailRoute />}
        />

        <Route
          path="*"
          element={<Navigate to="/app/habits" replace />}
        />
      </Routes>

      {logoutError && <p role="alert">{logoutError}</p>}

      <button type="button" onClick={onLogout}>
        Log out
      </button>

      {deleteError && <p role="alert">{deleteError}</p>}

      <button
        type="button"
        onClick={onDeleteAccount}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting account..." : "Delete account"}
      </button>

      <button type="button" onClick={() => navigate("/app/habits")}>
        Back to my habits
      </button>
    </main>
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
