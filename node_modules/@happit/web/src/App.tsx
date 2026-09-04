import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getHealth,
  type User,
} from "./services/api";

function App() {
  const [status, setStatus] = useState("Checking API...");
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        const health = await getHealth();
        setStatus(health.status);
      } catch {
        setStatus("API unavailable");
      }

      try {
        const result = await getCurrentUser();
        setUser(result.user);
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }

    initialize();
  }, []);

  return (
    <main>
      <h1>Happit</h1>

      <p>API status: {status}</p>

      {!authChecked ? (
        <p>Checking authentication...</p>
      ) : user ? (
        <p>Signed in as {user.email}</p>
      ) : (
        <p>Not authenticated</p>
      )}
    </main>
  );
}

export default App;