import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { LogoutIcon, UserIcon } from "./icons";
import styles from "./UserMenu.module.css";

function DepositModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-modal-title"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 id="deposit-modal-title" className={styles.modalTitle}>
          Deposit
        </h2>
        <p className={styles.modalText}>
          The deposit feature is coming soon. You'll be able to add funds to
          your account through our secure cashier system.
        </p>
        <button type="button" className={styles.modalBtn} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function UserMenu() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, handleClickOutside]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
  };

  if (isLoading) {
    return <div className={styles.loading}>...</div>;
  }

  if (!isAuthenticated) {
    return (
      <button type="button" className={styles.loginBtn} onClick={() => login()}>
        Login
      </button>
    );
  }

  return (
    <div className={styles.userMenu}>
      <button
        type="button"
        className={styles.depositBtn}
        onClick={() => setIsDepositModalOpen(true)}
      >
        Deposit
      </button>

      <div className={styles.avatarContainer} ref={menuRef}>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label={`User menu for ${user?.username}`}
        >
          <UserIcon />
        </button>

        {isMenuOpen && (
          <div className={styles.dropdown} role="menu">
            <div className={styles.dropdownHeader}>
              <span className={styles.username}>{user?.username}</span>
              {user?.email && (
                <span className={styles.email}>{user.email}</span>
              )}
            </div>
            <div className={styles.divider} />
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              role="menuitem"
            >
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
    </div>
  );
}

export default UserMenu;
