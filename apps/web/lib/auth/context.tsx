"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { authProvider } from "@/lib/auth";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authProvider.getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });

    const unsubscribe = authProvider.onAuthStateChange((newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const s = await authProvider.signInWithPassword(email, password);
      setSession(s);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authProvider.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.accessToken ?? null,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
