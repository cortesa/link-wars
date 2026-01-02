import { useState } from 'react';
import styles from './UserMenu.module.css';

function UserMenu() {
  const [isAuthenticated] = useState(false); // TODO: Connect to auth context

  if (!isAuthenticated) {
    return (
      <button type="button" className={styles.loginBtn}>
        Login
      </button>
    );
  }

  // TODO: Render avatar and account menu when authenticated
  return (
    <div className={styles.userAvatar}>
      <img src="/default-avatar.png" alt="User Avatar" />
    </div>
  );
}

export default UserMenu;
