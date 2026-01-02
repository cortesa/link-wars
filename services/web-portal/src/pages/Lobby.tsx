import { useNavigate } from 'react-router-dom';
import styles from './Lobby.module.css';

const currentGame = {
  title: "Tower Wars",
  description: "Strategy meets chaos in this multiplayer tower defense game.",
  slug: "tower-wars",
  thumbnail: "http://localhost:5174/thumbnail"
};

function Lobby() {
  const navigate = useNavigate();

  const startGame = () => {
    navigate(`/game/${currentGame.slug}`);
  };

  return (
    <div className={styles.lobbyContent}>
      <div className={styles.gameWrapper}>
        <div className={styles.iframeContainer}>
          <iframe
            src={currentGame.thumbnail}
            title={`${currentGame.title} - Thumbnail`}
            className={styles.gameThumbnail}
            allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media"
          />
          <div className={styles.gameOverlay}>
            <button type="button" className={styles.playNowBtn} onClick={startGame}>
              Play now ▶
            </button>
          </div>
        </div>
        <div className={styles.gameInfo}>
          <h1>{currentGame.title}</h1>
          <p>{currentGame.description}</p>
        </div>
      </div>
    </div>
  )
}

export default Lobby;
