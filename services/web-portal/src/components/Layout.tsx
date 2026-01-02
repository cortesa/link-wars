import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import styles from './Layout.module.css';

function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isGamePage = location.pathname.startsWith('/game/');
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const goToLobby = () => navigate('/');

  return (
    <div className={styles.layout}>
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <button
          type="button"
          className={`${styles.menuOverlay} ${styles.menuOpen}`}
          onClick={toggleMenu}
          onKeyDown={e => e.key === 'Escape' && toggleMenu()}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={styles.menuContent}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <button type="button" className={styles.closeMenuBtn} onClick={toggleMenu}>×</button>
            <nav className={styles.menuNav}>
              {isGamePage && (
                <button type="button" onClick={goToLobby} className={styles.menuLink}>Exit Game</button>
              )}
              <button type="button" className={styles.menuLink}>Leaderboard</button>
              <button type="button" className={styles.menuLink}>About</button>
            </nav>
          </div>
        </button>
      )}

      <Header
        onMenuToggle={toggleMenu}
        onLogoClick={goToLobby}
        showExitGame={isGamePage}
        onExitGame={goToLobby}
      />

      <main className={styles.mainContainer}>
        <Outlet />
      </main>

      <footer className={styles.adBanner}>
        <div className={styles.adBannerPlaceholder}>Banner Ad</div>
      </footer>
    </div>
  );
}

export default Layout;
