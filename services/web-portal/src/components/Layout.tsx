import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import styles from "./Layout.module.css";

function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isGamePage = location.pathname.startsWith("/game/");
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const goToLobby = () => navigate("/");

  return (
    <div className={styles.layout}>
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className={styles.menuOverlay}>
          <button
            type="button"
            className={styles.menuBackdrop}
            onClick={toggleMenu}
            aria-label="Close menu"
          />
          <div role="dialog" aria-modal="true" className={styles.menuContent}>
            <button
              type="button"
              className={styles.closeMenuBtn}
              onClick={toggleMenu}
            >
              ×
            </button>
            <nav className={styles.menuNav}>
              <ul className={styles.menuList}>
                {isGamePage && (
                  <li>
                    <button
                      type="button"
                      onClick={goToLobby}
                      className={styles.menuLink}
                    >
                      Exit Game
                    </button>
                  </li>
                )}
                <li>
                  <button type="button" className={styles.menuLink}>
                    Leaderboard
                  </button>
                </li>
                <li>
                  <button type="button" className={styles.menuLink}>
                    About
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
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
