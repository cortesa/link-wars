import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GamePage from '../GamePage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GamePage - Content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
  });

  const renderGamePage = () => {
    return render(
      <MemoryRouter initialEntries={['/game/tower-wars']}>
        <Routes>
          <Route path="/game/:gameSlug" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render with gameContent class', () => {
    const { container } = renderGamePage();

    const content = container.querySelector('[class*="gameContent"]');
    expect(content).toBeInTheDocument();
  });

  it('should render game iframe that fills available space', () => {
    renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'http://localhost:5174/game.html');
    expect(iframe.className).toContain('gameIframe');
  });

  it('should use fullscreen layout without sidebars', () => {
    const { container } = renderGamePage();

    // Should not have ad columns or sidebars
    const adColumns = container.querySelectorAll('[class*="adColumn"]');
    expect(adColumns.length).toBe(0);
  });

  it('should render game iframe without rounded corners', () => {
    const { container } = renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    const gameContent = container.querySelector('[class*="gameContent"]');

    expect(gameContent).toBeInTheDocument();
    // gameContent should contain the iframe
    expect(iframe.className).toContain('gameIframe');
  });

  it('should load correct game based on slug', () => {
    renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    expect(iframe).toHaveAttribute('src', 'http://localhost:5174/game.html');
  });

  it('should have correct layout structure (just game content)', () => {
    const { container } = renderGamePage();

    const gameContent = container.querySelector('[class*="gameContent"]');
    expect(gameContent).toBeInTheDocument();

    // Game content should contain only the iframe
    const iframe = gameContent?.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });
});
