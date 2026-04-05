/**
 * @file AI_CONTEXT.js
 * @description This file serves as a MANDATORY REFERENCE for any AI assistant or developer working on this repository.
 * It outlines the project structure, design standards, and technical patterns to ensure consistency across the platform.
 * 
 * IMPORTANT: Read this first before modifying any game or UI component.
 */

const PROJECT_CONTEXT = {
    PROJECT_NAME: "Multiplayer Web Game Platform (Sudoku, Chess, Snake, etc.)",
    FRONTEND_TECH: ["React", "Lucide-React", "Vanilla CSS / Inline Object Styles"],
    BACKEND_TECH: ["Node.js (Express)", "Socket.io"],

    /**
     * DESIGN STANDARDS (NON-NEGOTIABLE)
     * All games MUST follow these UI/UX patterns for uniformity.
     */
    UI_STANDARDS: {
        BACKGROUND: "Dark blue/black deep primary backgrounds (#0a0e16 or similar).",
        THEME: "Modern Glassmorphism (semi-transparent dark panels with subtle white borders).",
        
        LOBBY_HEADER: {
            ALIGNMENT: "CENTERED (justify-content: center).",
            ICON_SIZE: "Large (36px+), wrapped in a rounded-square or circular semi-transparent background.",
            TITLE: "Large (2.2rem+), Uppercase / Bold, Bright Gold (#eab308) or similar primary game color.",
            SUBTITLE: "NONE. Delete all game descriptions below the title to keep it clean like Snake/Tetris.",
        },

        LOBBY_BODY: {
            WIDTH: "Compact (max-width: 520px - 600px).",
            COMPONENTS: "Group selections (Mode, Map, Difficulty) using pill-shaped buttons and clear section labels.",
            COLOR_THEME: "Unique color per game (Snake: Blue, Pikachu: Yellow/Purple, Tetris: Purple).",
        },

        GAME_BOARD: {
            POSITIONING: "PERFECTLY CENTERED on screen.",
            WRAPPER: "Outer 'glass-panel' with a fixed or responsive height (e.g., 88vh), breathing room (padding) top/bottom.",
            INNER_PANEL: "The map/board should be placed inside its own dark-background inner panel (#050a14) to create depth.",
            CENTURING: "Never use absolute centering that causes pixelated stretch; use contain/fill wisely and flex auto-centering.",
        },

        GAME_OVER_OVERLAY: {
            STYLE: "Blurry backdrop (backdropFilter: blur(8px)) with a solid or semi-transparent background (rgba(0,0,0,0.8)).",
            CONTENT: "Large Emoji/Icon (top) -> BIG Title (Glow/Red for Game Over, Green for Win) -> Final Score -> Action Buttons.",
            BUTTONS: "Chơi Lại (btn-primary, vibrant) vs Thoát/Về Sảnh (btn-secondary).",
        },
        
        ANIMATIONS: {
            TRANSITIONS: "Subtle (0.15s - 0.2s) transitions for hover, select, and UI overlays.",
        }
    },

    /**
     * FOLDER MAPPING
     * Location of core game logic and UI files.
     */
    FILE_MAPPING: {
        SUDOKU: "src/pages/sudoku/",
        CHESS:  "src/pages/chess/",
        CARO:   "src/pages/caro/",
        SNAKE:  "src/pages/snake/",
        TETRIS: "src/pages/tetris/",
        PACMAN: "src/pages/pacman/",
        PIKACHU: "src/pages/pikachu/",
        
        COMMON_HOOKS: "src/hooks/ (e.g., useBgMusic.js)",
        COMMON_COMPONENTS: "src/components/ (Auth, Donate modals)",
        RESOURCES: "public/ (Assets like sprites, sounds)",
    },

    /**
     * TECHNICAL PATTERNS
     */
    PATTERNS: {
        GAME_LOGIC: "Separated into a custom hook (e.g., useSnakeLogic.js) for clean code.",
        COMMUNICATION: "Socket.io for multiplayer rooms (MultiplayerLobby components).",
        ASSETS: "External assets (Pikachu sg11 sprites) are mapped 1:1 to resource folders.",
    },

    /**
     * DEVELOPER NOTES (MUST FOLLOW)
     * - Do NOT add generic descriptions below game titles in lobbies.
     * - Ensure board scaling doesn't 'pixelate' sprites (use object-fit or pixelated rendering).
     * - Keep the logic out of the JSX where possible (usehooks).
     * - Lobby buttons should use the 'btn-primary' and 'btn-secondary' styles defined in global CSS.
     */
};

export default PROJECT_CONTEXT;
