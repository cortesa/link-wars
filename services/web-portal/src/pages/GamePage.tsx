import { useParams } from 'react-router-dom';
import styles from './GamePage.module.css';

const games: Record<string, { title: string; url: string }> = {
  'tower-wars': {
    title: "Tower Wars",
    url: "http://localhost:5174/game.html",
  }
};

function GamePage() {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  const activeGame = games[gameSlug || 'tower-wars'] || games['tower-wars'];

  return (
    <div className={styles.gameContent}>
      <iframe
        src={activeGame.url}
        title={activeGame.title}
        className={styles.gameIframe}
        allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media"
      />
    </div>
  )
}

export default GamePage;
