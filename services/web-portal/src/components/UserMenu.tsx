import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { useWallet } from "../wallet";
import { LogoutIcon, UserIcon } from "./icons";
import styles from "./UserMenu.module.css";

function DepositModal({
  isOpen,
  onClose,
  onDeposit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number) => Promise<void>;
}) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const options = [25, 50, 100, 150];

  useEffect(() => {
    if (!isOpen) {
      setSelectedAmount(null);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedAmount) {
      setError('Select an amount to continue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onDeposit(selectedAmount);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deposit failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <p className={styles.modalText}>Choose an amount to add to your wallet.</p>
        <div className={styles.amountOptions}>
          {options.map((amount) => (
            <button
              key={amount}
              type="button"
              className={
                selectedAmount === amount
                  ? `${styles.amountOption} ${styles.amountOptionActive}`
                  : styles.amountOption
              }
              onClick={() => setSelectedAmount(amount)}
            >
              {amount}
            </button>
          ))}
        </div>
        {error && <p className={styles.modalError}>{error}</p>}
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalBtnSecondary}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.modalBtn}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const { balance, isLoading: isBalanceLoading, depositFunds } = useWallet();
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

  const formatBalance = (amount: number | null): string => {
    if (amount === null) return "---";
    return amount.toLocaleString();
  };

  return (
    <div className={styles.userMenu}>
      <div className={styles.balanceDisplay}>
        <span className={styles.balanceLabel}>Balance:</span>
        <span className={styles.balanceAmount}>
          {isBalanceLoading ? "..." : formatBalance(balance)}
        </span>
      </div>

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
        onDeposit={depositFunds}
      />
    </div>
  );
}

export default UserMenu;
