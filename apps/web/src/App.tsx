import { useEffect, useState } from "react";
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

type AuthMode = "login" | "register";
type AppView = "habits" | "catalog";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appView, setAppView] = useState<AppView>("habits");

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
      <main>
        <h1>Happit</h1>

        <p>Welcome, {user.email}</p>

        <nav aria-label="Habit navigation">
          <button
            type="button"
            onClick={() => setAppView("habits")}
            aria-current={appView === "habits" ? "page" : undefined}
          >
            My habits
          </button>

          <button
            type="button"
            onClick={() => setAppView("catalog")}
            aria-current={appView === "catalog" ? "page" : undefined}
          >
            Habit catalog
          </button>
        </nav>

        {appView === "habits" ? <HabitList /> : <HabitCatalog />}

        {logoutError && <p role="alert">{logoutError}</p>}

        <button type="button" onClick={handleLogout}>
          Log out
        </button>

        {deleteError && <p role="alert">{deleteError}</p>}

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting account..." : "Delete account"}
        </button>
      </main>
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

export default App;
