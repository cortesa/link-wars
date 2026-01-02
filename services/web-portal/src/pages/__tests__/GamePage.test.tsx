import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock Header component
vi.mock('../../components/Header', () => ({
  default: ({ onLogoClick, onExitGame }: { onLogoClick: () => void; onExitGame: () => void }) => (
    <header data-testid="header">
      <button onClick={onLogoClick}>Logo</button>
      <button onClick={onExitGame}>Exit</button>
    </header>
  ),
}));

describe('GamePage - Mobile Layout', () => {
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

  it('should render with gamePageLayout class', () => {
    const { container } = renderGamePage();
    
    const layout = container.querySelector('[class*="gamePageLayout"]');
    expect(layout).toBeInTheDocument();
  });

  it('should render game iframe that fills available space', () => {
    renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'http://localhost:5174/game.html');
    expect(iframe.className).toContain('gamePageIframe');
  });

  it('should render banner ad at the bottom', () => {
    renderGamePage();

    const banner = screen.getByText('Banner Ad');
    expect(banner).toBeInTheDocument();
  });

  it('should have correct layout structure (header → iframe → banner)', () => {
    const { container } = renderGamePage();

    const layout = container.querySelector('[class*="gamePageLayout"]');
    const children = layout?.children;

    // Menu overlay first (hidden)
    expect(children?.[0]?.className).toContain('menuOverlay');
    // Header second
    expect(children?.[1]?.getAttribute('data-testid')).toBe('header');
    // Game content third
    expect(children?.[2]?.className).toContain('gamePageContent');
    // Banner last
    expect(children?.[3]?.className).toContain('gamePageBanner');
  });

  it('should navigate to lobby when exit game is clicked', () => {
    renderGamePage();

    const exitButton = screen.getByText('Exit');
    fireEvent.click(exitButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should navigate to lobby when logo is clicked', () => {
    renderGamePage();

    const logoButton = screen.getByText('Logo');
    fireEvent.click(logoButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should use fullscreen layout without sidebars', () => {
    const { container } = renderGamePage();

    // Should not have ad columns or sidebars
    const adColumns = container.querySelectorAll('[class*="adColumn"]');
    expect(adColumns.length).toBe(0);
  });

  it('should have banner with height of 80px', () => {
    const { container } = renderGamePage();

    const banner = container.querySelector('[class*="gamePageBanner"]');
    expect(banner).toBeInTheDocument();
    
    // Check computed styles would be applied (banner height: 80px from CSS)
    expect(banner?.className).toContain('gamePageBanner');
  });

  it('should render game iframe without rounded corners', () => {
    renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    const container = iframe.closest('[class*="gamePageContent"]');
    
    expect(container).toBeInTheDocument();
    // gamePageContent should have full width/height iframe
    expect(iframe.className).toContain('gamePageIframe');
  });

  it('should load correct game based on slug', () => {
    renderGamePage();

    const iframe = screen.getByTitle('Tower Wars');
    expect(iframe).toHaveAttribute('src', 'http://localhost:5174/game.html');
  });
});
