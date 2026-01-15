import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";

// Mock keycloak instance
const mockKeycloak = {
  init: vi.fn().mockResolvedValue(false),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  updateToken: vi.fn().mockResolvedValue(true),
  hasRealmRole: vi.fn().mockReturnValue(false),
  tokenParsed: null,
  token: null as string | null,
  authenticated: false,
  didInitialize: false,
  onTokenExpired: null as (() => void) | null,
};

vi.mock("../keycloak", () => ({
  initKeycloak: vi.fn().mockResolvedValue(null),
  getKeycloak: vi.fn(() => mockKeycloak),
  parseUserFromToken: vi.fn().mockReturnValue(null),
}));

// Test component that consumes the auth context
function TestConsumer() {
  const { isAuthenticated, isLoading, user, login, logout, register } =
    useAuth();

  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="authenticated">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="username">{user?.username || "anonymous"}</span>
      <button type="button" onClick={() => login()}>
        Login
      </button>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
      <button type="button" onClick={() => register()}>
        Register
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKeycloak.authenticated = false;
    mockKeycloak.token = null;
    mockKeycloak.didInitialize = false;
  });

  describe("Initial State", () => {
    it("should start with loading state", async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      // Initially loading
      expect(screen.getByTestId("loading")).toHaveTextContent("loading");

      // Allow AuthProvider async init to settle to avoid act() warnings.
      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });
    });

    it("should be unauthenticated after init when no session exists", async () => {
      const keycloak = await import("../keycloak");
      (keycloak.initKeycloak as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent("no");
      expect(screen.getByTestId("username")).toHaveTextContent("anonymous");
    });
  });

  describe("Login Action", () => {
    it("should call keycloak.login when login is invoked", async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });

      await user.click(screen.getByRole("button", { name: /login/i }));

      expect(mockKeycloak.login).toHaveBeenCalled();
    });
  });

  describe("Logout Action", () => {
    it("should call keycloak.logout when logout is invoked", async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });

      await user.click(screen.getByRole("button", { name: /logout/i }));

      expect(mockKeycloak.logout).toHaveBeenCalled();
    });
  });

  describe("Register Action", () => {
    it("should call keycloak.register when register is invoked", async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });

      await user.click(screen.getByRole("button", { name: /register/i }));

      expect(mockKeycloak.register).toHaveBeenCalled();
    });
  });

  describe("Authenticated State", () => {
    it("should update state when user is authenticated", async () => {
      const keycloak = await import("../keycloak");
      const mockUser = {
        id: "user-123",
        username: "testplayer",
        email: "test@example.com",
        roles: ["player"],
      };

      mockKeycloak.authenticated = true;
      mockKeycloak.token = "mock-token";
      (keycloak.initKeycloak as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockKeycloak,
      );
      (keycloak.parseUserFromToken as ReturnType<typeof vi.fn>).mockReturnValue(
        mockUser,
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent("yes");
      expect(screen.getByTestId("username")).toHaveTextContent("testplayer");
    });
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
