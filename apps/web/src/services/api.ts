const API_URL = "http://localhost:3000";

export async function getHealth() {
  const response = await fetch(`${API_URL}/api/v1/health`);

    if (!response.ok) {
        throw new Error("API request failed");
    }

    return response.json();
}   