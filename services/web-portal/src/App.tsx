import styles from './App.module.css';
import './index.css';

function App() {
  const games = {
    current: {
      title: "Tower War - Tactical Conquest",
      description: "Strategy meets chaos in this multiplayer tower defense game.",
      url: "http://localhost:5174"
    }
  };

  const activeGame = games.current;

  return (
    <div className={styles.appLayout}>
        <header className={styles.mainHeader}>
          <div className={styles.logo}>LINK WARS</div>
          <nav className={styles.nav}>
            <a href="#" className={styles.navItem}>Play</a>
            <a href="#" className={styles.navItem}>Leaderboard</a>
            <a href="#" className={styles.navItem}>About</a>
            <button className={styles.loginBtn}>Login</button>
          </nav>
        </header>
      <div className={styles.content}>

        <div className={styles.bannerSection}>
           <div className={styles.adBannerPlaceholder}>Banner Ad</div>
        </div>
        
        <aside className={`${styles.adColumn} ${styles.left}`}>
          <div className={`${styles.adPlaceholder} ${styles.adTop}`}>Advertisement</div>
          <div className={`${styles.adPlaceholder} ${styles.adBottom}`}>Advertisement</div>
        </aside>
        
        <main className={styles.gameWrapper}>
          <div className={styles.iframeContainer}>
            <iframe 
              src={activeGame.url} 
              title={activeGame.title}
              className={styles.gameIframe}
              allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media"
            />
          </div>
          <div className={styles.gameInfo}>
            <h1>{activeGame.title}</h1>
            <p>{activeGame.description}</p>
          </div>
        </main>
        
        <aside className={`${styles.adColumn} ${styles.right}`}>
          <div className={`${styles.adPlaceholder} ${styles.adTop}`}>Advertisement</div>
          <div className={`${styles.adPlaceholder} ${styles.adBottom}`}>Advertisement</div>
        </aside>
      </div>

      </div>
  )
}

export default App
