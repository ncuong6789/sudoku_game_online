// Các sự kiện Socket.IO dùng chung giữa Client và Server
const EVENTS = {
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
    SNAKE_GAME_STATE: 'snakeGameState',
    
    // Tank
    START_TANK_GAME: 'startTankGame',
    TANK_GAME_STARTED: 'tankGameStarted',
    TANK_UPDATE: 'tankUpdate',
    TANK_SHOOT: 'tankShoot',
    TANK_EXPLOSION: 'tankExplosion',
    TANK_GAME_OVER: 'tankGameOver',
    TANK_GAME_STATE: 'tankGameState',

    // Jungle Chess Events
    START_JUNGLE_GAME: 'startJungleGame',
    JUNGLE_GAME_STARTED: 'jungleGameStarted',
    JUNGLE_MOVE_PIECE: 'jungleMovePiece',
    JUNGLE_PIECE_CAPTURED: 'junglePieceCaptured',
    JUNGLE_GAME_OVER: 'jungleGameOver',
    JUNGLE_GAME_STATE: 'jungleGameState',
    JUNGLE_GET_HINT: 'jungleGetHint',
    JUNGLE_HINT_RECEIVED: 'jungleHintReceived',

    // Pikachu Online
    PIKACHU_START_GAME: 'pikachu:startGame',
    PIKACHU_GAME_STARTED: 'pikachu:gameStarted',
    PIKACHU_SELECT_TILE: 'pikachu:selectTile',
    PIKACHU_TILE_SELECTED: 'pikachu:tileSelected',
    PIKACHU_TILE_DESELECTED: 'pikachu:tileDeselected',
    PIKACHU_MATCH_ATTEMPT: 'pikachu:matchAttempt',
    PIKACHU_MATCHED_PAIR: 'pikachu:matchedPair',
    PIKACHU_MATCH_FAILED: 'pikachu:matchFailed',
    PIKACHU_USE_HINT: 'pikachu:useHint',
    PIKACHU_HINT_RESULT: 'pikachu:hintResult',
    PIKACHU_REQUEST_SHUFFLE: 'pikachu:requestShuffle',
    PIKACHU_SHUFFLE_CONSENT: 'pikachu:shuffleConsent',
    PIKACHU_SHUFFLE_REQUEST_RECEIVED: 'pikachu:shuffleRequestReceived',
    PIKACHU_SHUFFLE_REJECTED: 'pikachu:shuffleRejected',
    PIKACHU_BOARD_SHUFFLED: 'pikachu:boardShuffled',
    PIKACHU_GAME_OVER: 'pikachu:gameOver',
};

module.exports = { EVENTS };
