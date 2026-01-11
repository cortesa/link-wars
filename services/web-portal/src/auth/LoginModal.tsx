import styles from "./LoginModal.module.css";

interface LoginModalProps {
  onLogin: () => void;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: LoginModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <h2 id="login-modal-title" className={styles.title}>
          Login Required
        </h2>

        <p className={styles.message}>
          You need to be logged in to access this game.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.loginBtn} onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
