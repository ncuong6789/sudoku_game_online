import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SudokuHome from './pages/sudoku/SudokuHome';
import SoloGame from './pages/sudoku/SudokuGameSolo';
import MultiplayerLobby from './pages/sudoku/SudokuLobby';
import MultiplayerGame from './pages/sudoku/SudokuGameMulti';

// Caro Components
import CaroHome from './pages/caro/CaroHome';
import CaroGame from './pages/caro/CaroGame';
import CaroLobby from './pages/caro/CaroLobby';

// Chess Components
import ChessHome from './pages/chess/ChessHome';
import ChessLobby from './pages/chess/ChessLobby';
import ChessGame from './pages/chess/ChessGame';

// Snake Components
import SnakeHome from './pages/snake/SnakeHome';
import SnakeLobby from './pages/snake/SnakeLobby';
import SnakeGame from './pages/snake/SnakeGame';

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

        {/* Snake Module */}
        <Route path="/snake" element={<SnakeHome />} />
        <Route path="/snake/multiplayer" element={<SnakeLobby />} />
        <Route path="/snake/game" element={<SnakeGame />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
