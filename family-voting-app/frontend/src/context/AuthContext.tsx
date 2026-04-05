import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { googleLogin, getMe } from "../api/auth";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (googleToken: string) => Promise<void>;
  logout: () => void;
  familyId: number | null;
  setFamilyId: (id: number | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [familyId, setFamilyId] = useState<number | null>(() => {
    const stored = localStorage.getItem("family_id");
    return stored ? Number(stored) : null;
  });

  const handleSetFamilyId = useCallback((id: number | null) => {
    setFamilyId(id);
    if (id) {
      localStorage.setItem("family_id", String(id));
    } else {
      localStorage.removeItem("family_id");
    }
  }, []);

  const login = useCallback(async (googleToken: string) => {
    const authResponse = await googleLogin(googleToken);
    localStorage.setItem("access_token", authResponse.access_token);
    const me = await getMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("family_id");
    setUser(null);
    setFamilyId(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      getMe()
        .then((me) => setUser(me))
        .catch(() => {
          localStorage.removeItem("access_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        familyId,
        setFamilyId: handleSetFamilyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
