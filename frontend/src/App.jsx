import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

// Tetris Components
import TetrisHome from './pages/tetris/TetrisHome';
import TetrisLobby from './pages/tetris/TetrisLobby';
import TetrisGame from './pages/tetris/TetrisGame';

// Pacman Components
import PacmanHome from './pages/pacman/PacmanHome';
import PacmanGame from './pages/pacman/PacmanGame';

import PikachuHome from './pages/pikachu/PikachuHome';
import PikachuGame from './pages/pikachu/PikachuGame';
import PikachuLobby from './pages/pikachu/PikachuLobby';
import PikachuOnlineGame from './pages/pikachu/PikachuOnlineGame';

// Tank Components
import TankHome from './pages/tank/TankHome';
import TankLobby from './pages/tank/TankLobby';
import TankGame from './pages/tank/TankGame';

// Jungle Components
import JungleHome from './pages/jungle/JungleHome';
import JungleLobby from './pages/jungle/JungleLobby';
import JungleGame from './pages/jungle/JungleGame';

// Xiangqi Components
import XiangqiHome from './pages/xiangqi/XiangqiHome';
import XiangqiGame from './pages/xiangqi/XiangqiGame';

// Test Dashboard
import GameTestDashboard from './pages/test/GameTestDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

        {/* Tetris Module */}
        <Route path="/tetris" element={<TetrisHome />} />
        <Route path="/tetris/multiplayer" element={<TetrisLobby />} />
        <Route path="/tetris/game" element={<TetrisGame />} />
        
        {/* Pacman Module */}
        <Route path="/pacman" element={<PacmanHome />} />
        <Route path="/pacman/game" element={<PacmanGame />} />

        {/* Pikachu Module */}
        <Route path="/pikachu" element={<PikachuHome />} />
        <Route path="/pikachu/game" element={<PikachuGame />} />
        <Route path="/pikachu/lobby" element={<PikachuLobby />} />
        <Route path="/pikachu/online-game" element={<PikachuOnlineGame />} />

        {/* Tank Module */}
        <Route path="/tank" element={<TankHome />} />
        <Route path="/tank/multiplayer" element={<TankLobby />} />
        <Route path="/tank/game" element={<TankGame />} />

        {/* Jungle Module */}
        <Route path="/jungle" element={<JungleHome />} />
        <Route path="/jungle/multiplayer" element={<JungleLobby />} />
        <Route path="/jungle/game" element={<JungleGame />} />

        {/* Xiangqi Module */}
        <Route path="/xiangqi" element={<XiangqiHome />} />
        <Route path="/xiangqi/game" element={<XiangqiGame />} />

        {/* Test Dashboard */}
        <Route path="/test" element={<GameTestDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
