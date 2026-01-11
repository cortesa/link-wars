import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Lobby from "../Lobby";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Lobby - Content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
  });

  it("should render game thumbnail", () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const thumbnail = screen.getByTitle(/Tower Wars - Thumbnail/i);
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute("src", "http://localhost:5174/thumbnail");
  });

  it("should render game title and description below iframe", () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const title = screen.getByRole("heading", { name: /Tower Wars/i });
    const description = screen.getByText(/Strategy meets chaos/i);

    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });

  it("should render Play now button", () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const playButton = screen.getByRole("button", { name: /Play now/i });
    expect(playButton).toBeInTheDocument();
  });

  it("should navigate to game page when Play now is clicked", () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const playButton = screen.getByRole("button", { name: /Play now/i });
    fireEvent.click(playButton);

    expect(mockNavigate).toHaveBeenCalledWith("/game/tower-wars");
  });

  it("should have correct layout structure (game wrapper only)", () => {
    const { container } = render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const content = container.querySelector('[class*="lobbyContent"]');
    expect(content).toBeInTheDocument();

    const children = content?.children;
    expect(children?.[0]?.className).toContain("gameWrapper");
  });

  it("should not load game iframe initially", () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const gameIframes = screen.queryAllByTitle("Tower Wars");
    const thumbnailIframe = screen.getByTitle(/Tower Wars - Thumbnail/i);

    // Should only have thumbnail iframe, not game iframe
    expect(thumbnailIframe).toBeInTheDocument();
    expect(gameIframes.length).toBe(0);
  });

  it("should render with lobbyContent class", () => {
    const { container } = render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    const content = container.querySelector('[class*="lobbyContent"]');
    expect(content).toBeInTheDocument();
  });
});
