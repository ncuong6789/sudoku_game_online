# 🕹️ Multiplayer Game Hub - AI INSTRUCTIONS

> [!IMPORTANT]
> **ATTENTION AI AGENTS & BOTS:** Before modifying any code in this repository, you MUST read **`frontend/src/AI_CONTEXT.js`**. 
> It contains the "Source of Truth" for the project's UI/UX standards (Lobbies, Boards, Headers, etc.) to ensure consistency.

## 🚀 Getting Started

This is a multiplayer gaming platform featuring Sudoku, Chess, Snake, Tetris, Pac-Man, and Pikachu Onet.

- **Frontend:** `/frontend` (React + Vite)
- **Backend:** `/backend` (Node.js + Socket.io)

### 🧩 Core Architecture
- All games follow a standardized 'Lobby' and 'Game' page structure.
- State and logic for games should ideally reside in custom hooks (e.g., `src/pages/pikachu/usePikachuLogic.js`).

### 🎨 Design Language (Brief)
- **Theme:** Dark Modern Glassmorphism.
- **Lobby:** Centered Big Header (Icon + Title), Upper-case styling, No Subtitles below title. Pill buttons.
- **Game:** Centered Boards, inner panel backgrounds, breathable padding around the glass panel.

For the full, non-negotiable UI/UX standards list, see:
👉 [**frontend/src/AI_CONTEXT.js**](frontend/src/AI_CONTEXT.js)

---
© 2026 Game Hub Project.
