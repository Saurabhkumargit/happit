import { useEffect, useState } from "react";
import {
  getCurrentUser,
  logout,
  type User,
} from "./services/api";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";

type AuthMode = "login" | "register";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [logoutError, setLogoutError] = useState<string | null>(null);

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

  async function handleLogout() {
    setLogoutError(null);

    try {
      await logout();
      setUser(null);
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out",
      );
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

        {logoutError && <p role="alert">{logoutError}</p>}

        <button type="button" onClick={handleLogout}>
          Log out
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
            <button
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Create one
            </button>
          </p>
        </>
      ) : (
        <>
          <RegisterForm onSuccess={handleAuthSuccess} />

          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Log in
            </button>
          </p>
        </>
      )}
    </main>
  );
}

export default App;