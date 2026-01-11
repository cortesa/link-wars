import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Layout from "../Layout";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Header component
vi.mock("../Header", () => ({
  default: ({ onMenuToggle, onLogoClick, showExitGame, onExitGame }: any) => (
    <header data-testid="header">
      <button onClick={onMenuToggle} data-testid="menu-toggle">
        Menu
      </button>
      <button onClick={onLogoClick} data-testid="logo">
        Logo
      </button>
      {showExitGame && (
        <button onClick={onExitGame} data-testid="exit-game">
          Exit Game
        </button>
      )}
    </header>
  ),
}));

describe("Layout Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialRoute = "/") => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={<div data-testid="lobby-content">Lobby</div>}
            />
            <Route
              path="/game/:gameSlug"
              element={<div data-testid="game-content">Game</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  };

  describe("Grid Layout Structure", () => {
    it("should render with layout class (CSS Grid)", () => {
      const { container } = renderLayout();

      const layout = container.querySelector('[class*="layout"]');
      expect(layout).toBeInTheDocument();
    });

    it("should render header, main container, and ad banner", () => {
      renderLayout();

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByText("Banner Ad")).toBeInTheDocument();
    });

    it("should have correct structure order (header → main → footer)", () => {
      const { container } = renderLayout();

      const layout = container.querySelector('[class*="layout"]');
      const children = Array.from(layout?.children || []).filter(
        (el) => !el.className.includes("menuOverlay"),
      );

      // Header first
      expect(children[0]?.getAttribute("data-testid")).toBe("header");
      // Main container second
      expect(children[1]?.tagName).toBe("MAIN");
      // Footer (ad banner) third
      expect(children[2]?.tagName).toBe("FOOTER");
    });
  });

  describe("Route Content Rendering", () => {
    it("should render Lobby content on root route", () => {
      renderLayout("/");

      expect(screen.getByTestId("lobby-content")).toBeInTheDocument();
    });

    it("should render Game content on game route", () => {
      renderLayout("/game/tower-wars");

      expect(screen.getByTestId("game-content")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to lobby when logo is clicked", () => {
      renderLayout("/game/tower-wars");

      const logo = screen.getByTestId("logo");
      fireEvent.click(logo);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should show exit game button on game pages", () => {
      renderLayout("/game/tower-wars");

      expect(screen.getByTestId("exit-game")).toBeInTheDocument();
    });

    it("should not show exit game button on lobby", () => {
      renderLayout("/");

      expect(screen.queryByTestId("exit-game")).not.toBeInTheDocument();
    });

    it("should navigate to lobby when exit game is clicked", () => {
      renderLayout("/game/tower-wars");

      const exitButton = screen.getByTestId("exit-game");
      fireEvent.click(exitButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Menu Overlay", () => {
    it("should not render menu overlay when closed", () => {
      const { container } = renderLayout();

      const menuOverlay = container.querySelector('[class*="menuOverlay"]');
      expect(menuOverlay).not.toBeInTheDocument();
    });

    it("should render menu overlay when opened", () => {
      const { container } = renderLayout();

      const menuButton = screen.getByTestId("menu-toggle");
      fireEvent.click(menuButton);

      const menuOverlay = container.querySelector('[class*="menuOverlay"]');
      expect(menuOverlay).toBeInTheDocument();
    });

    it("should show Exit Game in menu on game pages", () => {
      renderLayout("/game/tower-wars");

      const menuButton = screen.getByTestId("menu-toggle");
      fireEvent.click(menuButton);

      // Menu should have Exit Game link
      const menuLinks = screen.getAllByRole("button");
      const exitGameLinks = menuLinks.filter(
        (btn) => btn.textContent === "Exit Game",
      );
      expect(exitGameLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Ad Banner", () => {
    it("should render ad banner in footer", () => {
      renderLayout();

      const banner = screen.getByText("Banner Ad");
      expect(banner).toBeInTheDocument();
    });

    it("should render ad banner on both lobby and game pages", () => {
      const { unmount } = renderLayout("/");
      expect(screen.getByText("Banner Ad")).toBeInTheDocument();
      unmount();

      renderLayout("/game/tower-wars");
      expect(screen.getByText("Banner Ad")).toBeInTheDocument();
    });
  });
});
