import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../../utils/socket';

const EVENTS = {
    PIKACHU_START_GAME: 'pikachu:startGame',
    PIKACHU_GAME_STARTED: 'pikachu:gameStarted',
    PIKACHU_SELECT_TILE: 'pikachu:selectTile',
    PIKACHU_TILE_SELECTED: 'pikachu:tileSelected',
    PIKACHU_TILE_DESELECTED: 'pikachu:tileDeselected',
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
    OPPONENT_DISCONNECTED: 'opponentDisconnected',
    OPPONENT_HINT_USED: 'pikachu:opponentHintUsed',
};

const MY_COLOR   = '#ef4444'; // đỏ – tự nhìn mình
const OPP_COLOR  = '#38bdf8'; // xanh dương – màu đối thủ

export function usePikachuOnline({ roomId, isHost }) {
    const [board, setBoard]                     = useState([]);
    const [gameStatus, setGameStatus]           = useState('waiting'); // waiting | playing | gameover
    const [mySocketId, setMySocketId]           = useState('');
    const [opponentSocketId, setOpponentSocketId] = useState('');

    // Selections
    const [mySelected, setMySelected]           = useState(null);   // {r,c}
    const [opponentSelected, setOpponentSelected] = useState(null); // {r,c}

    // Paths for SVG line drawing
    const [myPath, setMyPath]                   = useState(null);
    const [opponentPath, setOpponentPath]       = useState(null);

    // Scores
    const [myScore, setMyScore]                 = useState(0);
    const [opponentScore, setOpponentScore]     = useState(0);

    // Hints
    const [myHints, setMyHints]                 = useState(3);
    const [opponentHints, setOpponentHints]     = useState(3);

    // Hint pair gợi ý (chỉ cho mình nhìn)
    const [hintPair, setHintPair]               = useState(null);

    // Shuffle
    const [shufflePending, setShufflePending]   = useState(false); // mình đã gửi request
    const [shuffleRequest, setShuffleRequest]   = useState(null);  // {requestedBy, countdown}
    const [shuffleCountdown, setShuffleCountdown] = useState(0);
    const shuffleTimerRef                        = useRef(null);

    // Game over
    const [gameResult, setGameResult]           = useState(null);  // {winnerId, scores}

    const [penaltyFlash, setPenaltyFlash]       = useState(false);

    // ── Countdown helper ─────────────────────────────────────────────────────
    const startCountdown = useCallback((seconds) => {
        setShuffleCountdown(seconds / 1000);
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = setInterval(() => {
            setShuffleCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(shuffleTimerRef.current);
                    setShuffleRequest(null);
                    setShufflePending(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // ── Start game (host emits start after both joined) ───────────────────────
    useEffect(() => {
        if (isHost && roomId && socket.connected) {
            socket.emit(EVENTS.PIKACHU_START_GAME, { roomId });
        }
    }, [isHost, roomId]);

    // ── Socket listeners ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!roomId) return;

        const onGameStarted = (data) => {
            setBoard(data.board);
            setMySocketId(data.mySocketId);
            setOpponentSocketId(data.opponentSocketId);
            setMyScore(0);
            setOpponentScore(0);
            setMyHints(3);
            setOpponentHints(3);
            setGameStatus('playing');
            setMySelected(null);
            setOpponentSelected(null);
            setMyPath(null);
            setOpponentPath(null);
        };

        const onTileSelected = ({ by, r, c }) => {
            if (by === socket.id) {
                setMySelected({ r, c });
            } else {
                setOpponentSelected({ r, c });
            }
            setHintPair(null);
        };

        const onTileDeselected = ({ by }) => {
            if (by === socket.id) {
                setMySelected(null);
            } else {
                setOpponentSelected(null);
            }
        };

        const onMatchedPair = ({ by, path, board: newBoard, scores, isWin }) => {
            const isMine = by === socket.id;

            if (isMine) {
                setMyPath(path);
                setMySelected(null);
                setTimeout(() => setMyPath(null), 500);
            } else {
                setOpponentPath(path);
                setOpponentSelected(null);
                setTimeout(() => setOpponentPath(null), 500);
            }
            setBoard(newBoard);
            setMyScore(scores[socket.id] ?? 0);
            setOpponentScore(scores[by === socket.id ? opponentSocketId : by] ?? 0);
            setHintPair(null);
        };

        const onMatchFailed = () => {
            setMySelected(null);
            // Flash penalty
            setPenaltyFlash(true);
            setTimeout(() => setPenaltyFlash(false), 600);
        };

        const onHintResult = ({ pair, hintsLeft }) => {
            setHintPair(pair);
            setMyHints(hintsLeft);
        };

        const onOpponentHintUsed = ({ opponentHintsLeft }) => {
            setOpponentHints(opponentHintsLeft);
        };

        const onShuffleRequestReceived = ({ requestedBy, timeoutMs }) => {
            setShuffleRequest({ requestedBy });
            startCountdown(timeoutMs);
        };

        const onShuffleRejected = () => {
            clearInterval(shuffleTimerRef.current);
            setShuffleRequest(null);
            setShufflePending(false);
            setShuffleCountdown(0);
        };

        const onBoardShuffled = ({ board: newBoard }) => {
            clearInterval(shuffleTimerRef.current);
            setBoard(newBoard);
            setShuffleRequest(null);
            setShufflePending(false);
            setShuffleCountdown(0);
            setMySelected(null);
            setOpponentSelected(null);
            setHintPair(null);
        };

        const onGameOver = ({ scores, winnerId }) => {
            setGameStatus('gameover');
            setGameResult({ scores, winnerId });
        };

        const onOpponentDisconnected = () => {
            setGameStatus('gameover');
            setGameResult({ disconnected: true, winnerId: socket.id });
        };

        socket.on(EVENTS.PIKACHU_GAME_STARTED, onGameStarted);
        socket.on(EVENTS.PIKACHU_TILE_SELECTED, onTileSelected);
        socket.on(EVENTS.PIKACHU_TILE_DESELECTED, onTileDeselected);
        socket.on(EVENTS.PIKACHU_MATCHED_PAIR, onMatchedPair);
        socket.on(EVENTS.PIKACHU_MATCH_FAILED, onMatchFailed);
        socket.on(EVENTS.PIKACHU_HINT_RESULT, onHintResult);
        socket.on(EVENTS.OPPONENT_HINT_USED, onOpponentHintUsed);
        socket.on(EVENTS.PIKACHU_SHUFFLE_REQUEST_RECEIVED, onShuffleRequestReceived);
        socket.on(EVENTS.PIKACHU_SHUFFLE_REJECTED, onShuffleRejected);
        socket.on(EVENTS.PIKACHU_BOARD_SHUFFLED, onBoardShuffled);
        socket.on(EVENTS.PIKACHU_GAME_OVER, onGameOver);
        socket.on(EVENTS.OPPONENT_DISCONNECTED, onOpponentDisconnected);

        return () => {
            socket.off(EVENTS.PIKACHU_GAME_STARTED, onGameStarted);
            socket.off(EVENTS.PIKACHU_TILE_SELECTED, onTileSelected);
            socket.off(EVENTS.PIKACHU_TILE_DESELECTED, onTileDeselected);
            socket.off(EVENTS.PIKACHU_MATCHED_PAIR, onMatchedPair);
            socket.off(EVENTS.PIKACHU_MATCH_FAILED, onMatchFailed);
            socket.off(EVENTS.PIKACHU_HINT_RESULT, onHintResult);
            socket.off(EVENTS.OPPONENT_HINT_USED, onOpponentHintUsed);
            socket.off(EVENTS.PIKACHU_SHUFFLE_REQUEST_RECEIVED, onShuffleRequestReceived);
            socket.off(EVENTS.PIKACHU_SHUFFLE_REJECTED, onShuffleRejected);
            socket.off(EVENTS.PIKACHU_BOARD_SHUFFLED, onBoardShuffled);
            socket.off(EVENTS.PIKACHU_GAME_OVER, onGameOver);
            socket.off(EVENTS.OPPONENT_DISCONNECTED, onOpponentDisconnected);
            clearInterval(shuffleTimerRef.current);
        };
    }, [roomId, opponentSocketId, startCountdown]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleTileClick = useCallback((r, c) => {
        if (gameStatus !== 'playing' || !roomId) return;
        socket.emit(EVENTS.PIKACHU_SELECT_TILE, { roomId, r, c });
    }, [gameStatus, roomId]);

    const useHint = useCallback(() => {
        if (myHints <= 0 || gameStatus !== 'playing') return;
        socket.emit(EVENTS.PIKACHU_USE_HINT, { roomId });
    }, [myHints, gameStatus, roomId]);

    const requestShuffle = useCallback(() => {
        if (shufflePending || shuffleRequest || gameStatus !== 'playing') return;
        setShufflePending(true);
        socket.emit(EVENTS.PIKACHU_REQUEST_SHUFFLE, { roomId });
    }, [shufflePending, shuffleRequest, gameStatus, roomId]);

    const respondToShuffle = useCallback((agree) => {
        socket.emit(EVENTS.PIKACHU_SHUFFLE_CONSENT, { roomId, agree });
        clearInterval(shuffleTimerRef.current);
        setShuffleRequest(null);
        setShuffleCountdown(0);
    }, [roomId]);

    return {
        // Board
        board,
        gameStatus,
        // Identity
        mySocketId,
        opponentSocketId,
        MY_COLOR,
        OPP_COLOR,
        // Selections
        mySelected,
        opponentSelected,
        // Paths
        myPath,
        opponentPath,
        // Scores
        myScore,
        opponentScore,
        // Hints
        myHints,
        opponentHints,
        hintPair,
        // Shuffle
        shufflePending,
        shuffleRequest,
        shuffleCountdown,
        // Result
        gameResult,
        penaltyFlash,
        // Actions
        handleTileClick,
        useHint,
        requestShuffle,
        respondToShuffle,
    };
}
