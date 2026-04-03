// Bản sao của backend/utils/constants.js
export const EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    
    // Core & Room
    CREATE_ROOM: 'createRoom',
    JOIN_ROOM: 'joinRoom',
    LOOKUP_ROOM: 'lookupRoom',
    LEAVE_ROOM: 'leaveRoom',
    PLAYER_JOINED: 'playerJoined',
    OPPONENT_DISCONNECTED: 'opponentDisconnected',
    
    // Matchmaking
    FIND_MATCH: 'findMatch',
    MATCH_FOUND: 'matchFound',
    WAITING_FOR_MATCH: 'waitingForMatch',
    LEAVE_MATCHMAKING: 'leaveMatchmaking',
    
    // Stats & Progress
    STATS_UPDATE: 'statsUpdate',
    GET_STATS: 'getStats',
    UPDATE_PROGRESS: 'updateProgress',
    OPPONENT_PROGRESS: 'opponentProgress',
    
    // Game Flow (Sudoku & General)
    START_GAME: 'startGame',
    GAME_STARTED: 'gameStarted',
    GAME_OVER: 'gameOver',
    OPPONENT_GAME_OVER: 'opponentGameOver',
    
    // Chat
    SEND_MESSAGE: 'sendMessage',
    RECEIVE_MESSAGE: 'receiveMessage',
    
    // Caro
    START_CARO_GAME: 'startCaroGame',
    CARO_GAME_STARTED: 'caroGameStarted',
    CARO_MOVE: 'caroMove',
    CARO_MOVED: 'caroMoved',
    
    // Chess
    CHESS_COLOR_SELECT: 'chessColorSelect',
    CHESS_COLOR_UPDATE: 'chessColorUpdate',
    START_CHESS_GAME: 'startChessGame',
    CHESS_GAME_STARTED: 'chessGameStarted',
    CHESS_MOVE: 'chessMove',
    CHESS_MOVED: 'chessMoved',
    
    // Tetris
    START_TETRIS_GAME: 'startTetrisGame',
    TETRIS_GAME_STARTED: 'tetrisGameStarted',
    TETRIS_UPDATE: 'tetrisUpdate',
    OPPONENT_TETRIS_UPDATE: 'opponentTetrisUpdate',
    TETRIS_PLAYER_LOST: 'tetrisPlayerLost',
    TETRIS_GAME_OVER_RESULT: 'tetrisGameOverResult',
    
    // Snake
    START_SNAKE_GAME: 'startSnakeGame',
    SNAKE_GAME_STARTED: 'snakeGameStarted',
    SNAKE_CHANGE_DIRECTION: 'snakeChangeDirection',
    SNAKE_DASH: 'snakeDash',
    SNAKE_GAME_STATE: 'snakeGameState'
};
