import { createContext, useContext, useState, type ReactNode } from "react";

const TOKEN_KEY = "cex_token";
const EMAIL_KEY = "cex_email";

interface AuthState {
  token: string | null;
  email: string | null;
  girisYap: (email: string, password: string) => Promise<void>;
  kayitOl: (email: string, password: string) => Promise<void>;
  cikisYap: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

async function authIstek(path: string, email: string, password: string): Promise<{ token: string; email: string }> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "İşlem başarısız oldu.");
  }
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));

  const oturumKaydet = (t: string, e: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(EMAIL_KEY, e);
    setToken(t);
    setEmail(e);
  };

  const girisYap = async (email: string, password: string) => {
    const sonuc = await authIstek("/login", email, password);
    oturumKaydet(sonuc.token, sonuc.email);
  };

  const kayitOl = async (email: string, password: string) => {
    const sonuc = await authIstek("/register", email, password);
    oturumKaydet(sonuc.token, sonuc.email);
  };

  const cikisYap = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  };

  return <AuthContext.Provider value={{ token, email, girisYap, kayitOl, cikisYap }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı.");
  return ctx;
}

// Standalone accessor for non-component code (api.ts, ws.ts) that can't use the hook.
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function oturumuTemizle(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
