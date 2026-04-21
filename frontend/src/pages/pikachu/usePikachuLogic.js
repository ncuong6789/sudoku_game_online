import { useState, useCallback, useEffect, useRef } from 'react';

// Audio mappings based on SG11
const tapSound = new window.Audio('/pikachu_audio/click.mp3');
const leadSound = new window.Audio('/pikachu_audio/linked.mp3');
const bgWinsound = new window.Audio('/pikachu_audio/win.mp3'); 
const finishSound = new window.Audio('/pikachu_audio/finish.mp3');
const noMoveSound = new window.Audio('/pikachu_audio/no_move.mp3');
const errorSound = new window.Audio('/pikachu_audio/oho.mp3');

const playSound = (audioObj) => {
    try {
        audioObj.currentTime = 0;
        audioObj.play().catch(() => {});
    } catch(e) {}
};

const ROWS = 9;
const COLS = 16;
// Grid will be (ROWS + 2) x (COLS + 2) for boundary
const R = ROWS + 2; 
const C = COLS + 2;

// Cấp độ tối đa 5 kiểu di chuyển.
const NUM_IMAGES = 36;

export function generateInitialBoard() {
    let items = [];
    let numPairs = (ROWS * COLS) / 2;
    
    // Ensure all 36 images are equally distributed as much as possible
    let pairsPerImage = Math.floor(numPairs / NUM_IMAGES);
    let remainderPairs = numPairs % NUM_IMAGES;

    for (let id = 1; id <= NUM_IMAGES; id++) {
        for (let j = 0; j < pairsPerImage; j++) {
            items.push(id, id);
        }
    }
    
    // Fill the remaining pairs with random distinct images
    for (let i = 0; i < remainderPairs; i++) {
        let id = Math.floor(Math.random() * NUM_IMAGES) + 1;
        items.push(id, id);
    }
    
    items.sort(() => Math.random() - 0.5);

    let board = Array.from({ length: R }, () => Array(C).fill(0));
    let idx = 0;
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            board[r][c] = items[idx++];
        }
    }
    return board;
}

function getCross(board, r, c) {
    let points = [];
    const cast = (dr, dc) => {
        let cr = r + dr, cc = c + dc;
        while (cr >= 0 && cr < R && cc >= 0 && cc < C && board[cr][cc] === 0) {
            points.push({ r: cr, c: cc });
            cr += dr; cc += dc;
        }
    };
    cast(-1, 0); cast(1, 0); cast(0, -1); cast(0, 1);
    points.push({ r, c }); // include origin
    return points;
}

function isEmptyLine(board, r1, c1, r2, c2) {
    if (r1 !== r2 && c1 !== c2) return false;
    if (r1 === r2) {
        let minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
            if (board[r1][c] !== 0) return false;
        }
    } else {
        let minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            if (board[r][c1] !== 0) return false;
        }
    }
    return true;
}

export function findPath(board, p1, p2) {
    if (p1.r === p2.r && p1.c === p2.c) return null;
    if (board[p1.r][p1.c] === 0 || board[p2.r][p2.c] === 0) return null;
    if (board[p1.r][p1.c] !== board[p2.r][p2.c]) return null;

    const cross1 = getCross(board, p1.r, p1.c);
    const cross2 = getCross(board, p2.r, p2.c);

    let bestPath = null;
    let minTurns = 4;

    for (let pt1 of cross1) {
        for (let pt2 of cross2) {
            if (pt1.r === pt2.r || pt1.c === pt2.c) {
                if (isEmptyLine(board, pt1.r, pt1.c, pt2.r, pt2.c)) {
                    const path = [p1, pt1, pt2, p2];
                    const cleanPath = path.filter((v, i, a) => i === 0 || v.r !== a[i - 1].r || v.c !== a[i - 1].c);
                    let turns = cleanPath.length - 2;
                    if (turns < minTurns) {
                        minTurns = turns;
                        bestPath = cleanPath;
                    }
                }
            }
        }
    }
    return bestPath;
}

export function hasValidPair(board) {
    const map = {};
    let emptyCount = 0;
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            if (board[r][c] !== 0) {
                if (!map[board[r][c]]) map[board[r][c]] = [];
                map[board[r][c]].push({ r, c });
            } else {
                emptyCount++;
            }
        }
    }
    if (emptyCount === ROWS * COLS) return 'win';

    for (let id in map) {
        let tiles = map[id];
        for (let i = 0; i < tiles.length; i++) {
            for (let j = i + 1; j < tiles.length; j++) {
                const path = findPath(board, tiles[i], tiles[j]);
                if (path) return [tiles[i], tiles[j]];
            }
        }
    }
    return null;
}

export function shuffleBoard(board) {
    let newBoard = board.map(row => [...row]);
    let tiles = [];
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            if (newBoard[r][c] !== 0) tiles.push(newBoard[r][c]);
        }
    }
    tiles.sort(() => Math.random() - 0.5);
    let idx = 0;
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            if (newBoard[r][c] !== 0) {
                newBoard[r][c] = tiles[idx++];
            }
        }
    }
    return newBoard;
}

export function applyLevelMovement(board, p1, p2, level) {
    let newBoard = board.map(row => [...row]);
    
    // Xóa vị trí vừa nối
    newBoard[p1.r][p1.c] = 0;
    newBoard[p2.r][p2.c] = 0;

    let mode = level; // Levels 1 to 11

    if (mode === 1) return newBoard; 

    // Helper functions for full-board shifting
    const shiftCol = (c, dir) => {
        let colData = [];
        for (let r = 1; r <= ROWS; r++) if (newBoard[r][c] !== 0) colData.push(newBoard[r][c]);
        for (let r = 1; r <= ROWS; r++) newBoard[r][c] = 0; // Clear
        let start = dir === 1 ? ROWS - colData.length + 1 : 1; // 1 means gravity down (to bottom)
        for (let i = 0; i < colData.length; i++) newBoard[start + i][c] = colData[i];
    };
    const shiftRow = (r, dir) => {
        let rowData = [];
        for (let c = 1; c <= COLS; c++) if (newBoard[r][c] !== 0) rowData.push(newBoard[r][c]);
        for (let c = 1; c <= COLS; c++) newBoard[r][c] = 0; // Clear
        let start = dir === 1 ? COLS - rowData.length + 1 : 1; // 1 means gravity right (to edge)
        for (let i = 0; i < rowData.length; i++) newBoard[r][start + i] = rowData[i];
    };

    if (mode === 2) { for(let c = 1; c <= COLS; c++) shiftCol(c, -1); } // Up
    else if (mode === 3) { for(let c = 1; c <= COLS; c++) shiftCol(c, 1); } // Down
    else if (mode === 4) { for(let r = 1; r <= ROWS; r++) shiftRow(r, 1); } // Right
    else if (mode === 5) { for(let r = 1; r <= ROWS; r++) shiftRow(r, -1); } // Left
    else if (mode === 6) { for(let r = 1; r <= ROWS; r++) shiftRow(r, -1); for(let c = 1; c <= COLS; c++) shiftCol(c, -1); } // Top-Left
    else if (mode === 7) { for(let r = 1; r <= ROWS; r++) shiftRow(r, 1);  for(let c = 1; c <= COLS; c++) shiftCol(c, -1); } // Top-Right
    else if (mode === 8) { for(let r = 1; r <= ROWS; r++) shiftRow(r, 1);  for(let c = 1; c <= COLS; c++) shiftCol(c, 1); } // Bottom-Right
    else if (mode === 9) { for(let r = 1; r <= ROWS; r++) shiftRow(r, -1); for(let c = 1; c <= COLS; c++) shiftCol(c, 1); } // Bottom-Left
    else if (mode === 10) { // Center Horizontal
        for (let r = 1; r <= ROWS; r++) {
            let leftHalf = [], rightHalf = [];
            let mid = Math.floor(COLS / 2);
            for (let c = 1; c <= mid; c++) if (newBoard[r][c] !== 0) leftHalf.push(newBoard[r][c]);
            for (let c = COLS; c > mid; c--) if (newBoard[r][c] !== 0) rightHalf.push(newBoard[r][c]);
            for (let c = 1; c <= COLS; c++) newBoard[r][c] = 0;
            for (let i = 0; i < leftHalf.length; i++) newBoard[r][mid - i] = leftHalf[leftHalf.length - 1 - i];
            for (let i = 0; i < rightHalf.length; i++) newBoard[r][mid + 1 + i] = rightHalf[rightHalf.length - 1 - i];
        }
    }
    else if (mode === 11) { // Split Edges Horizontal
        for (let r = 1; r <= ROWS; r++) {
            let leftHalf = [], rightHalf = [];
            let mid = Math.floor(COLS / 2);
            for (let c = 1; c <= mid; c++) if (newBoard[r][c] !== 0) leftHalf.push(newBoard[r][c]);
            for (let c = mid + 1; c <= COLS; c++) if (newBoard[r][c] !== 0) rightHalf.push(newBoard[r][c]);
            for (let c = 1; c <= COLS; c++) newBoard[r][c] = 0;
            for (let i = 0; i < leftHalf.length; i++) newBoard[r][i + 1] = leftHalf[i];
            for (let i = 0; i < rightHalf.length; i++) newBoard[r][COLS - rightHalf.length + 1 + i] = rightHalf[i];
        }
    }

    return newBoard;
}

export function usePikachuLogic(gameMode = 'classic', timeLimitEnabled = true, resume = false) {
    const [board, setBoard] = useState([]);
    const [activeRows, setActiveRows] = useState(ROWS);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(100);
    const [status, setStatus] = useState('playing'); // playing, won, gameover, finished
    
    const [selected, setSelected] = useState(null);
    const [connectedPath, setConnectedPath] = useState(null);
    const [hints, setHints] = useState(gameMode === 'classic' ? 9 : 7);
    const [shuffles, setShuffles] = useState(gameMode === 'classic' ? 22 : 12);
    const [hintPair, setHintPair] = useState(null);
    const [penaltyFlash, setPenaltyFlash] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);

    // Trigger the red-flash animation on the timer bar
    const triggerPenalty = useCallback((amount) => {
        if (!timeLimitEnabled || status !== 'playing' || isPaused) return;
        playSound(errorSound);
        setTimeLeft(prev => Math.max(0, prev - amount));
        setPenaltyFlash(true);
        setTimeout(() => setPenaltyFlash(false), 600);
    }, [timeLimitEnabled, status, isPaused]);

    const checkAndFixDeadlock = useCallback((currentBoard) => {
        let pair = hasValidPair(currentBoard);
        if (pair === 'win') {
            return { board: currentBoard, isWin: true };
        }
        let maxTries = 50;
        let b = currentBoard;
        while (!pair && maxTries > 0) {
            b = shuffleBoard(b);
            pair = hasValidPair(b);
            maxTries--;
            if (maxTries === 0 && !pair) {
                // Completely deadlocked
                playSound(noMoveSound);
            }
        }
        return { board: b, isWin: false };
    }, []);

    const initGame = useCallback((nextLevel = false, isResume = false) => {
        if (isResume) {
            const savedStr = localStorage.getItem('pikachu_save');
            if (savedStr) {
                try {
                    const saved = JSON.parse(savedStr);
                    if (saved.status === 'playing') {
                        setBoard(saved.board);
                        setActiveRows(saved.activeRows);
                        setLevel(saved.level);
                        setScore(saved.score);
                        setTimeLeft(saved.timeLeft);
                        setHints(saved.hints);
                        setShuffles(saved.shuffles);
                        setStatus('playing');
                        setIsPaused(true); // Pause directly to give the user time when resuming
                        bgWinsound.pause(); bgWinsound.currentTime = 0;
                        finishSound.pause(); finishSound.currentTime = 0;
                        setSelected(null);
                        setConnectedPath(null);
                        setHintPair(null);
                        return; // Skip standard init
                    }
                } catch(e) {}
            }
        }

        const newLvl = nextLevel ? level + 1 : 1;
        
        let targetLevel = newLvl;
        if (gameMode === 'classic' && targetLevel === 6) {
            targetLevel = 10; // Skip 6,7,8,9 in classic mode according to sg11
        }
        
        if (targetLevel > 11) {
            setStatus('finished');
            playSound(finishSound);
            return;
        }

        setLevel(targetLevel);
        if (!nextLevel) {
            setScore(0);
            setHints(gameMode === 'classic' ? 9 : 7);
            setShuffles(gameMode === 'classic' ? 22 : 12);
        } else if (gameMode === 'full') {
            // Full mode grants rewards per level
            setHints(h => h + 2);
            setShuffles(s => s + 3);
        }

        let b = generateInitialBoard();
        let fixState = checkAndFixDeadlock(b);
        setBoard(fixState.board);
        setActiveRows(ROWS);
        setTimeLeft(100);
        setStatus('playing');
        setIsPaused(false);
        bgWinsound.pause(); bgWinsound.currentTime = 0;
        finishSound.pause(); finishSound.currentTime = 0;
        setSelected(null);
        setConnectedPath(null);
        setHintPair(null);
    }, [level, gameMode, checkAndFixDeadlock]);

    useEffect(() => {
        initGame(false, resume);
        // eslint-disable-next-line
    }, [resume]);

    // Save/resume logic
    const stateRef = useRef({ board, activeRows, level, score, timeLeft, hints, shuffles, status, gameMode, timeLimitEnabled });
    useEffect(() => {
        stateRef.current = { board, activeRows, level, score, timeLeft, hints, shuffles, status, gameMode, timeLimitEnabled };
    }, [board, activeRows, level, score, timeLeft, hints, shuffles, status, gameMode, timeLimitEnabled]);

    useEffect(() => {
        const saveInterval = setInterval(() => {
            const s = stateRef.current;
            if (s.status === 'playing') {
                localStorage.setItem('pikachu_save', JSON.stringify(s));
            } else if (s.status === 'gameover' || s.status === 'finished') {
                localStorage.removeItem('pikachu_save');
            }
        }, 2000);
        return () => clearInterval(saveInterval);
    }, []);

    useEffect(() => {
        if (status === 'playing' && timeLimitEnabled && !isPaused) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) {
                        setStatus('gameover');
                        playSound(noMoveSound);
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 0.05; 
                });
            }, 100);
        }
        return () => clearInterval(timerRef.current);
    }, [status, timeLimitEnabled, isPaused]);

    const handleTileClick = useCallback((r, c) => {
        if (status !== 'playing' || isPaused || board[r][c] === 0 || connectedPath) return;

        playSound(tapSound);

        if (!selected) {
            setSelected({ r, c });
            setHintPair(null);
        } else {
            if (selected.r === r && selected.c === c) {
                setSelected(null);
                return;
            }

            const path = findPath(board, selected, { r, c });
            if (path) {
                setConnectedPath(path);
                playSound(leadSound);
                // Draw path, then remove
                setTimeout(() => {
                    let newBoard = applyLevelMovement(board, selected, { r, c }, level);
                    let fixState = checkAndFixDeadlock(newBoard);
                    newBoard = fixState.board;
                    
                    if (fixState.isWin) {
                        setStatus('won');
                        playSound(bgWinsound);
                    }
                    
                    // Calculate active rows - shrink only when 2 adjacent rows are empty
                    setActiveRows(prevRows => {
                        let emptyRows = [];
                        for (let r = 1; r <= prevRows; r++) {
                            const hasTile = newBoard[r].slice(1, COLS + 1).some(v => v !== 0);
                            if (!hasTile) emptyRows.push(r);
                        }
                        
                        let newActiveRows = prevRows;
                        for (let i = 0; i < emptyRows.length - 1; i++) {
                            if (emptyRows[i + 1] === emptyRows[i] + 1) {
                                newActiveRows = Math.max(3, prevRows - 1);
                                break;
                            }
                        }
                        return newActiveRows;
                    });
                    
                    setBoard(newBoard);
                    setScore(s => s + 10);
                    if (timeLimitEnabled) setTimeLeft(prev => Math.min(100, prev + 2));
                    setSelected(null);
                    setConnectedPath(null);
                }, 400);
            } else {
                triggerPenalty(10);
                setSelected(null);
            }
        }
    }, [status, isPaused, board, selected, connectedPath, level, checkAndFixDeadlock]);

    const useHint = () => {
        if (hints > 0 && status === 'playing' && !isPaused && !hintPair) {
            const pair = hasValidPair(board);
            if (pair && pair !== 'win') {
                setHintPair(pair);
                setHints(h => h - 1);
                if (timeLimitEnabled) setTimeLeft(prev => Math.max(0, prev - 5)); // Penalty
            }
        }
    };

    const handleShuffle = useCallback(() => {
        if (shuffles > 0 && status === 'playing' && !isPaused) {
            setBoard(shuffleBoard(board));
            setShuffles(s => s - 1);
            setHintPair(null);
            setSelected(null);
        }
    }, [shuffles, status, isPaused, board]);

    const togglePause = () => {
        if (status === 'playing') setIsPaused(!isPaused);
    };
    
    return {
        board, ROWS, COLS, activeRows, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair, penaltyFlash, isPaused, togglePause,
        handleTileClick, useHint, handleShuffle, initGame, checkAndFixDeadlock
    };
}
