import { useEffect, useState } from "react";
import { getHealth } from "./services/api";

function App() {
  const [status, setStatus] = useState("Checking API...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((data) => {
        setStatus(data.status);
      })
      .catch(() => {
        setError("Unable to connect to API");
      });
  }, []);

  return (
    <main>
      <h1>Happit</h1>

      <p>API status: {error ?? status}</p>
    </main>
  );
}

export default App;