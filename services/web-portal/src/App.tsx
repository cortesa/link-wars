import './index.css'

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
    <div className="app-layout">
      <header className="main-header">
        <div className="logo">LINK WARS</div>
        <nav>
          <a href="#" className="nav-item">Play</a>
          <a href="#" className="nav-item">Leaderboard</a>
          <a href="#" className="nav-item">About</a>
          <button className="login-btn">Login</button>
        </nav>
      </header>
      
      <div className="main-content-grid">
        <aside className="ad-column left">
          <div className="ad-placeholder">Advertisement</div>
          <div className="ad-placeholder">Advertisement</div>
        </aside>
        
        <main className="game-wrapper">
          <div className="iframe-container">
            <iframe 
              src={activeGame.url} 
              title={activeGame.title}
              className="game-iframe"
              allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media"
            />
          </div>
          <div className="game-info">
            <h1>{activeGame.title}</h1>
            <p>{activeGame.description}</p>
          </div>
        </main>
        
        <aside className="ad-column right">
          <div className="ad-placeholder">Advertisement</div>
          <div className="ad-placeholder">Advertisement</div>
        </aside>
      </div>

      <div className="bottom-content">
         <div className="ad-banner-placeholder">Banner Ad</div>
      </div>
    </div>
  )
}

export default App
