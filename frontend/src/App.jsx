```javascript
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SoloGame from './pages/SoloGame';
import MultiplayerLobby from './pages/MultiplayerLobby';
import MultiplayerGame from './pages/MultiplayerGame';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/solo" element={<SoloGame />} />
        <Route path="/multiplayer" element={<MultiplayerLobby />} />
        <Route path="/multiplayer-game" element={<MultiplayerGame />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
```
