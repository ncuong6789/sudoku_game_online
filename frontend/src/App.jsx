import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SoloGame from './pages/SoloGame';
import MultiplayerLobby from './pages/MultiplayerLobby';
import MultiplayerGame from './pages/MultiplayerGame';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/solo" element={<SoloGame />} />
        <Route path="/multiplayer" element={<MultiplayerLobby />} />
        <Route path="/multiplayer-game" element={<MultiplayerGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
