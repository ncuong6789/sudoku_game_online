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

// Chess Components
import ChessHome from './pages/chess/ChessHome';
import ChessLobby from './pages/chess/ChessLobby';
import ChessGame from './pages/chess/ChessGame';

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

        {/* Chess Module */}
        <Route path="/chess" element={<ChessHome />} />
        <Route path="/chess/multiplayer" element={<ChessLobby />} />
        <Route path="/chess/game" element={<ChessGame />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
