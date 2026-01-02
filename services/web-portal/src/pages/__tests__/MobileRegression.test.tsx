import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Lobby from '../Lobby';
import GamePage from '../GamePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../components/Header', () => ({
  default: ({ onMenuToggle, onLogoClick, showExitGame, onExitGame }: any) => (
    <header data-testid="header">
      <button onClick={onMenuToggle}>Menu</button>
      {showExitGame ? (
        <button onClick={onExitGame}>Exit Game</button>
      ) : (
        <button>Play</button>
      )}
      {onLogoClick && <button onClick={onLogoClick}>Logo</button>}
    </header>
  ),
}));

describe('Mobile Regression Tests', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalInnerWidth = global.innerWidth;
    originalInnerHeight = global.innerHeight;
    
    // Set mobile viewport (iPhone SE)
    global.innerWidth = 375;
    global.innerHeight = 667;
  });

  afterEach(() => {
    global.innerWidth = originalInnerWidth;
    global.innerHeight = originalInnerHeight;
  });

  describe('Mobile Navigation Flow', () => {
    it('should navigate from Lobby to GamePage on mobile', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      const playButton = screen.getByRole('button', { name: /Play now/i });
      fireEvent.click(playButton);

      expect(mockNavigate).toHaveBeenCalledWith('/game/tower-wars');
    });

    it('should navigate back to Lobby from GamePage', () => {
      render(
        <MemoryRouter initialEntries={['/game/tower-wars']}>
          <Routes>
            <Route path="/game/:gameSlug" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      );

      const exitButtons = screen.getAllByText('Exit Game');
      fireEvent.click(exitButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Mobile Layout Consistency', () => {
    it('Lobby should maintain correct element order on mobile', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      const content = container.querySelector('[class*="content"]');
      const children = Array.from(content?.children || []);

      // Banner first
      expect(children[0]?.className).toContain('bannerSection');
      // Game wrapper second (contains iframe and game info)
      expect(children[1]?.tagName).toBe('MAIN');
    });

    it('GamePage should maintain correct element order on mobile', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/game/tower-wars']}>
          <Routes>
            <Route path="/game/:gameSlug" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      );

      const layout = container.querySelector('[class*="gamePageLayout"]');
      const children = Array.from(layout?.children || []);

      // Skip menu overlay (hidden), check visible structure
      const visibleElements = children.filter(
        (el) => !el.className.includes('menuOverlay')
      );

      // Header → Content (iframe) → Banner
      expect(visibleElements[0]?.getAttribute('data-testid')).toBe('header');
      expect(visibleElements[1]?.className).toContain('gamePageContent');
      expect(visibleElements[2]?.className).toContain('gamePageBanner');
    });
  });

  describe('Mobile Content Rendering', () => {
    it('should not show sidebars on mobile Lobby', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      const sidebars = container.querySelectorAll('[class*="adColumn"]');
      expect(sidebars.length).toBe(0);
    });

    it('should not show sidebars on mobile GamePage', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/game/tower-wars']}>
          <Routes>
            <Route path="/game/:gameSlug" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      );

      const sidebars = container.querySelectorAll('[class*="adColumn"]');
      expect(sidebars.length).toBe(0);
    });

    it('should show banner ad on both pages', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      expect(screen.getByText('Banner Ad')).toBeInTheDocument();
      unmount();

      render(
        <MemoryRouter initialEntries={['/game/tower-wars']}>
          <Routes>
            <Route path="/game/:gameSlug" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Banner Ad')).toBeInTheDocument();
    });
  });

  describe('Mobile Game Display', () => {
    it('should show thumbnail in Lobby, not full game', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      const thumbnail = screen.getByTitle(/Tower Wars - Thumbnail/i);
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', 'http://localhost:5174/thumbnail');

      // Should not have game iframe
      const gameIframes = screen.queryByTitle('Tower Wars');
      expect(gameIframes).not.toBeInTheDocument();
    });

    it('should show full game iframe in GamePage', () => {
      render(
        <MemoryRouter initialEntries={['/game/tower-wars']}>
          <Routes>
            <Route path="/game/:gameSlug" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      );

      const gameIframe = screen.getByTitle('Tower Wars');
      expect(gameIframe).toBeInTheDocument();
      expect(gameIframe).toHaveAttribute('src', 'http://localhost:5174/game.html');
    });
  });

  describe('Mobile Responsive Behavior', () => {
    it('should handle portrait orientation (375x667)', () => {
      global.innerWidth = 375;
      global.innerHeight = 667;

      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      expect(container.querySelector('[class*="appLayout"]')).toBeInTheDocument();
    });

    it('should handle landscape orientation (667x375)', () => {
      global.innerWidth = 667;
      global.innerHeight = 375;

      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Lobby />
        </MemoryRouter>
      );

      expect(container.querySelector('[class*="appLayout"]')).toBeInTheDocument();
    });

    it('should handle different mobile screen sizes', () => {
      const sizes = [
        { width: 320, height: 568 }, // iPhone 5/SE
        { width: 375, height: 667 }, // iPhone 6/7/8
        { width: 414, height: 896 }, // iPhone XR/11
      ];

      sizes.forEach(({ width, height }) => {
        global.innerWidth = width;
        global.innerHeight = height;

        const { unmount } = render(
          <MemoryRouter initialEntries={['/']}>
            <Lobby />
          </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /Play now/i })).toBeInTheDocument();
        unmount();
      });
    });
  });
});
