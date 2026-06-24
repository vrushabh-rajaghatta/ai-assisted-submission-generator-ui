import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import apiService from "../services/api";

export interface AuthUser {
  id: string;
  username: string;
  full_name: string | null;
  is_admin: boolean;
  is_super_admin?: boolean;
  is_active: boolean;
  must_change_password?: boolean;
  organization_id: string;
  organization?: { id: string; name: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "auth_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(STORAGE_KEY),
    loading: true,
    error: null,
  });

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const me = await apiService.getCurrentUser();
      return me;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setState({ user: null, token: null, loading: false, error: null });
      return;
    }
    const me = await fetchMe();
    if (me) {
      setState({ user: me, token, loading: false, error: null });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setState({ user: null, token: null, loading: false, error: null });
    }
  }, [fetchMe]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { access_token } = await apiService.login(username, password);
        localStorage.setItem(STORAGE_KEY, access_token);
        const me = await fetchMe();
        if (!me) {
          localStorage.removeItem(STORAGE_KEY);
          setState({
            user: null,
            token: null,
            loading: false,
            error: "Could not load profile",
          });
          return false;
        }
        setState({
          user: me,
          token: access_token,
          loading: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        const message =
          err?.response?.data?.detail || err?.message || "Login failed";
        setState({ user: null, token: null, loading: false, error: message });
        return false;
      }
    },
    [fetchMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ user: null, token: null, loading: false, error: null });
    // Hard redirect so any in-flight queries / cached state are cleared.
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
