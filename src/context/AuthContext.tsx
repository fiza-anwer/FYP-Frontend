import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getToken, getTokenExpiry } from "../api/client";

const USER_KEY = "user";
const TOKEN_KEY = "token";

export type AuthUser = {
  email?: string;
  name?: string;
  avatar?: string;
  username?: string;
  tenant_name?: string;
  role?: string;
  member_since?: string | null;
  last_login_at?: string | null;
  email_verified?: boolean;
  [key: string]: unknown;
};

type AuthContextType = {
  user: AuthUser | null;
  isSuperadmin: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readUserFromStorage(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(readUserFromStorage);

  useEffect(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    const token = getToken();
    const stored = readUserFromStorage();
    if (!token && stored) {
      setUserState(null);
      sessionStorage.removeItem(USER_KEY);
    } else {
      setUserState(stored);
    }
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("tokenExpiresAt");
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const expiresAt = getTokenExpiry();
    if (!token || expiresAt === null) {
      logout();
      return;
    }

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      window.location.replace("/signin");
      return;
    }

    const timeout = window.setTimeout(() => {
      logout();
      window.location.replace("/signin");
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [logout, user]);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem("tokenExpiresAt");
    }
  }, []);

  const isSuperadmin = user?.role === "superadmin";

  const value: AuthContextType = {
    user,
    isSuperadmin: !!isSuperadmin,
    setUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
