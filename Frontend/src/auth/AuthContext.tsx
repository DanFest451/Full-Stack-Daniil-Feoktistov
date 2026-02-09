import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import { clearToken, getToken, saveToken } from "../utils/storage";
import type { AuthResponse } from "../types";

type AuthContextValue = {
  token: string | null;
  email: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
    setLoading(false);
  }, []);

  const isAuthenticated = !!token;

  async function register(emailInput: string, password: string) {
    const res = await api.register(emailInput, password);
    saveToken(res.token);
    setToken(res.token);
    setEmail(res.user?.email ?? emailInput);
    return res;
  }

  async function login(emailInput: string, password: string) {
    const res = await api.login(emailInput, password);
    saveToken(res.token);
    setToken(res.token);
    setEmail(res.user?.email ?? emailInput);
    return res;
  }

  function logout() {
    clearToken();
    setToken(null);
    setEmail(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, email, loading, isAuthenticated, register, login, logout }),
    [token, email, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
