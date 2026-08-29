const API_URL = import.meta.env.VITE_API_URL;

export async function getHealth() {
  const response = await fetch(`${API_URL}/api/v1/health`);

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}