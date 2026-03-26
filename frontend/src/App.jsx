import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SudokuHome from './pages/SudokuHome';
import SoloGame from './pages/SoloGame';
import MultiplayerLobby from './pages/MultiplayerLobby';
import MultiplayerGame from './pages/MultiplayerGame';

// Caro Components
import CaroHome from './pages/caro/CaroHome';
import CaroGame from './pages/caro/CaroGame';
import CaroLobby from './pages/caro/CaroLobby';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Sudoku Module */}
        <Route path="/sudoku" element={<SudokuHome />} />
        <Route path="/sudoku/solo" element={<SoloGame />} />
        <Route path="/sudoku/multiplayer" element={<MultiplayerLobby />} />
        <Route path="/sudoku/multiplayer-game" element={<MultiplayerGame />} />

        {/* Caro Module */}
        <Route path="/caro" element={<CaroHome />} />
        <Route path="/caro/multiplayer" element={<CaroLobby />} />
        <Route path="/caro/game" element={<CaroGame />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
