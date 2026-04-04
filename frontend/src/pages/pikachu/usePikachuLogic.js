import { useState, useCallback, useEffect, useRef } from 'react';

const ROWS = 16;
const COLS = 16;
// Grid will be (ROWS + 2) x (COLS + 2) for boundary
const R = ROWS + 2; 
const C = COLS + 2;

// Cấp độ tối đa 5 kiểu di chuyển.
const NUM_IMAGES = 36;

export function generateInitialBoard() {
    let items = [];
    let numPairs = (ROWS * COLS) / 2; // 128
    for (let i = 0; i < numPairs; i++) {
        // Pick a random pokemon ID from 1 to 36
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

    let mode = (level - 1) % 5; 
    // 0: static
    // 1: gravity down
    // 2: shift left
    // 3: shift right
    // 4: center horizontal

    if (mode === 0) return newBoard; 

    const rowsAffected = [...new Set([p1.r, p2.r])];
    const colsAffected = [...new Set([p1.c, p2.c])];

    if (mode === 1) { // Gravity Down
        for (let c of colsAffected) {
            let colData = [];
            for (let r = 1; r <= ROWS; r++) if (newBoard[r][c] !== 0) colData.push(newBoard[r][c]);
            let zeroCount = ROWS - colData.length;
            for (let r = 1; r <= zeroCount; r++) newBoard[r][c] = 0;
            for (let i = 0; i < colData.length; i++) newBoard[zeroCount + 1 + i][c] = colData[i];
        }
    } else if (mode === 2) { // Shift Left
        for (let r of rowsAffected) {
            let rowData = [];
            for (let c = 1; c <= COLS; c++) if (newBoard[r][c] !== 0) rowData.push(newBoard[r][c]);
            for (let i = 0; i < rowData.length; i++) newBoard[r][i + 1] = rowData[i];
            for (let c = rowData.length + 1; c <= COLS; c++) newBoard[r][c] = 0;
        }
    } else if (mode === 3) { // Shift Right
        for (let r of rowsAffected) {
            let rowData = [];
            for (let c = 1; c <= COLS; c++) if (newBoard[r][c] !== 0) rowData.push(newBoard[r][c]);
            let zeroCount = COLS - rowData.length;
            for (let c = 1; c <= zeroCount; c++) newBoard[r][c] = 0;
            for (let i = 0; i < rowData.length; i++) newBoard[r][zeroCount + 1 + i] = rowData[i];
        }
    } else if (mode === 4) { // Center Horizontal
        for (let r of rowsAffected) {
            let leftHalf = [], rightHalf = [];
            let mid = Math.floor(COLS / 2);
            for (let c = 1; c <= mid; c++) if (newBoard[r][c] !== 0) leftHalf.push(newBoard[r][c]);
            for (let c = COLS; c > mid; c--) if (newBoard[r][c] !== 0) rightHalf.push(newBoard[r][c]);

            for (let c = 1; c <= COLS; c++) newBoard[r][c] = 0;
            
            for (let i = 0; i < leftHalf.length; i++) {
                newBoard[r][mid - i] = leftHalf[leftHalf.length - 1 - i];
            }
            for (let i = 0; i < rightHalf.length; i++) {
                newBoard[r][mid + 1 + i] = rightHalf[rightHalf.length - 1 - i];
            }
        }
    }

    return newBoard;
}

export function usePikachuLogic() {
    const [board, setBoard] = useState([]);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(100);
    const [status, setStatus] = useState('playing'); // playing, won, gameover
    
    const [selected, setSelected] = useState(null);
    const [connectedPath, setConnectedPath] = useState(null);
    const [hints, setHints] = useState(3);
    const [shuffles, setShuffles] = useState(1);
    const [hintPair, setHintPair] = useState(null);
    const timerRef = useRef(null);

    const checkAndFixDeadlock = useCallback((currentBoard) => {
        let pair = hasValidPair(currentBoard);
        if (pair === 'win') {
            setStatus('won');
            return currentBoard;
        }
        let maxTries = 50;
        let b = currentBoard;
        while (!pair && maxTries > 0) {
            b = shuffleBoard(b);
            pair = hasValidPair(b);
            maxTries--;
        }
        return b;
    }, []);

    const initGame = useCallback((nextLevel = false) => {
        const newLvl = nextLevel ? level + 1 : 1;
        setLevel(newLvl);
        if (!nextLevel) setScore(0);
        let b = generateInitialBoard();
        b = checkAndFixDeadlock(b);
        setBoard(b);
        setTimeLeft(100);
        setStatus('playing');
        setSelected(null);
        setConnectedPath(null);
        setHints(3);
        setShuffles(1);
        setHintPair(null);
    }, [level, checkAndFixDeadlock]);

    useEffect(() => {
        initGame();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (status === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setStatus('gameover');
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 0.5; // Decrement every second (using 100 as total, so 0.5 is 200s total or we can just decrement. Let's say 150s)
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [status]);

    const handleTileClick = (r, c) => {
        if (status !== 'playing' || board[r][c] === 0 || connectedPath) return;

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
                // Draw path, then remove
                setTimeout(() => {
                    let newBoard = applyLevelMovement(board, selected, { r, c }, level);
                    newBoard = checkAndFixDeadlock(newBoard);
                    if (hasValidPair(newBoard) === 'win') setStatus('won');
                    
                    setBoard(newBoard);
                    setScore(s => s + 10);
                    setTimeLeft(prev => Math.min(100, prev + 2));
                    setSelected(null);
                    setConnectedPath(null);
                }, 400); // 400ms for path animation
            } else {
                setSelected({ r, c });
            }
        }
    };

    const useHint = () => {
        if (hints > 0 && status === 'playing' && !hintPair) {
            const pair = hasValidPair(board);
            if (pair && pair !== 'win') {
                setHintPair(pair);
                setHints(h => h - 1);
                setTimeLeft(prev => Math.max(0, prev - 5)); // Penalty
            }
        }
    };

    const handleShuffle = () => {
        if (shuffles > 0 && status === 'playing') {
            setBoard(shuffleBoard(board));
            setShuffles(s => s - 1);
            setHintPair(null);
            setSelected(null);
        }
    };

    return {
        board, ROWS, COLS, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair,
        handleTileClick, useHint, handleShuffle, initGame, checkAndFixDeadlock
    };
}
