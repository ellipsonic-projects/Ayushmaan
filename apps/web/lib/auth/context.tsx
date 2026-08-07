"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { authProvider } from "@/lib/auth";
import type { AuthSession, AuthUser } from "@/lib/auth/types";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<AuthSession | null>;
  signInWithGoogle: (redirectTo: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<AuthSession>;
  resendSignupEmail: (email: string) => Promise<void>;
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
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      setLoading(true);
      try {
        const s = await authProvider.signUpWithPassword(email, password, metadata);
        if (s) setSession(s);
        return s;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (redirectTo: string) => {
    await authProvider.signInWithGoogle(redirectTo);
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    await authProvider.sendOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setLoading(true);
    try {
      const s = await authProvider.verifyOtp(email, token);
      setSession(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendSignupEmail = useCallback(async (email: string) => {
    await authProvider.resendSignupEmail(email);
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
        signUp,
        signInWithGoogle,
        sendOtp,
        verifyOtp,
        resendSignupEmail,
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
