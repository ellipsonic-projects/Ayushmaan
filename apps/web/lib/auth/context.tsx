"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: "consultant" | "client";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    userType: "consultant" | "client"
  ) => Promise<void>;
  logout: () => void;
  bypassLogin: (userType: "consultant" | "client") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("authToken");
      const savedUser = localStorage.getItem("authUser");
      if (saved && savedUser) {
        setToken(saved);
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      userType: "consultant" | "client"
    ) => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            userType,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Registration failed");
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }, []);

  const bypassLogin = useCallback((userType: "consultant" | "client") => {
    const mockUser: User = {
      id: "mock-id-" + userType,
      email: `demo-${userType}@example.com`,
      firstName: "Demo",
      lastName: userType.charAt(0).toUpperCase() + userType.slice(1),
      userType,
    };
    const mockToken = "mock-jwt-token-for-" + userType;
    setToken(mockToken);
    setUser(mockUser);
    localStorage.setItem("authToken", mockToken);
    localStorage.setItem("authUser", JSON.stringify(mockUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, bypassLogin }}>
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
