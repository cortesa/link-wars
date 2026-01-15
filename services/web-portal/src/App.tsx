import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGuard, AuthProvider } from "./auth";
import { WalletProvider } from "./wallet";
import Layout from "./components/Layout";
import Callback from "./pages/Callback";
import GamePage from "./pages/GamePage";
import Lobby from "./pages/Lobby";
import "./index.css";

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Lobby />} />
              <Route
                path="/game/:gameSlug"
                element={
                  <AuthGuard>
                    <GamePage />
                  </AuthGuard>
                }
              />
              <Route path="/callback" element={<Callback />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
