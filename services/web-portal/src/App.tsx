import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Lobby from './pages/Lobby';
import GamePage from './pages/GamePage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:gameSlug" element={<GamePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
