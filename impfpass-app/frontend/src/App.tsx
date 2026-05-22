import { useEffect, useState } from "react";
import LoginPage from "@/components/LoginPage";
import { authFetch, clearAccessToken, getAccessToken, type AuthUser } from "@/lib/auth";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) return;

    authFetch("/api/v1/auth/me")
      .then((response) => {
        if (!response.ok) throw new Error("Session abgelaufen");
        return response.json() as Promise<AuthUser>;
      })
      .then(setUser)
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogout() {
    clearAccessToken();
    setUser(null);
  }

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onAuthenticated={setUser} />;
  }

  return <Dashboard authUser={user} onLogout={handleLogout} />;
}
