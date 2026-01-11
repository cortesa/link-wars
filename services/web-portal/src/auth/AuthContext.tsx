import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getKeycloak,
  initKeycloak,
  type KeycloakUser,
  parseUserFromToken,
} from "./keycloak";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: KeycloakUser | null;
  accessToken: string | null;
  login: (redirectUri?: string) => void;
  logout: () => void;
  register: () => void;
  hasRole: (role: string) => boolean;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const keycloak = await initKeycloak();

        if (keycloak) {
          setIsAuthenticated(true);
          setUser(parseUserFromToken(keycloak));
          setAccessToken(keycloak.token || null);

          // Setup token refresh
          keycloak.onTokenExpired = async () => {
            try {
              const refreshed = await keycloak.updateToken(30);
              if (refreshed) {
                setAccessToken(keycloak.token || null);
              }
            } catch (error) {
              console.error("Token refresh failed:", error);
              setIsAuthenticated(false);
              setUser(null);
              setAccessToken(null);
            }
          };
        }
      } catch (error) {
        console.error("Keycloak initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = useCallback((redirectUri?: string) => {
    if (redirectUri) {
      sessionStorage.setItem("redirectAfterLogin", redirectUri);
    }
    getKeycloak().login({
      redirectUri: `${window.location.origin}/callback`,
    });
  }, []);

  const register = useCallback(() => {
    getKeycloak().register({
      redirectUri: `${window.location.origin}/callback`,
    });
  }, []);

  const logout = useCallback(() => {
    getKeycloak().logout({
      redirectUri: window.location.origin,
    });
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return getKeycloak().hasRealmRole(role);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      await getKeycloak().updateToken(30);
      return getKeycloak().token || null;
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    accessToken,
    login,
    logout,
    register,
    hasRole,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
