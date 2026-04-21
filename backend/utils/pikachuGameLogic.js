/**
 * pikachuGameLogic.js
 * Pure functions – no state, no side effects.
 * Ported from frontend usePikachuLogic.js to run server-side.
 */

const ROWS = 9;
const COLS = 16;
const R = ROWS + 2; // grid with 1-cell border on each side
const C = COLS + 2;
const NUM_IMAGES = 36;

// ─── Board Generation ────────────────────────────────────────────────────────

function generateInitialBoard() {
    let items = [];
    const numPairs = (ROWS * COLS) / 2;
    const pairsPerImage = Math.floor(numPairs / NUM_IMAGES);
    const remainderPairs = numPairs % NUM_IMAGES;

    for (let id = 1; id <= NUM_IMAGES; id++) {
        for (let j = 0; j < pairsPerImage; j++) {
            items.push(id, id);
        }
    }
    for (let i = 0; i < remainderPairs; i++) {
        const id = Math.floor(Math.random() * NUM_IMAGES) + 1;
        items.push(id, id);
    }
    items.sort(() => Math.random() - 0.5);

    const board = Array.from({ length: R }, () => Array(C).fill(0));
    let idx = 0;
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            board[r][c] = items[idx++];
        }
    }
    return board;
}

// ─── Path Finding ─────────────────────────────────────────────────────────────

function getCross(board, r, c) {
    const points = [];
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
        const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
        for (let c = minC + 1; c < maxC; c++) {
            if (board[r1][c] !== 0) return false;
        }
    } else {
        const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            if (board[r][c1] !== 0) return false;
        }
    }
    return true;
}

function findPath(board, p1, p2) {
    if (p1.r === p2.r && p1.c === p2.c) return null;
    if (board[p1.r][p1.c] === 0 || board[p2.r][p2.c] === 0) return null;
    if (board[p1.r][p1.c] !== board[p2.r][p2.c]) return null;

    const cross1 = getCross(board, p1.r, p1.c);
    const cross2 = getCross(board, p2.r, p2.c);

    let bestPath = null;
    let minTurns = 4;

    for (const pt1 of cross1) {
        for (const pt2 of cross2) {
            if (pt1.r === pt2.r || pt1.c === pt2.c) {
                if (isEmptyLine(board, pt1.r, pt1.c, pt2.r, pt2.c)) {
                    const path = [p1, pt1, pt2, p2];
                    const cleanPath = path.filter(
                        (v, i, a) => i === 0 || v.r !== a[i - 1].r || v.c !== a[i - 1].c
                    );
                    const turns = cleanPath.length - 2;
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

// ─── Valid Pair Check ─────────────────────────────────────────────────────────

function hasValidPair(board) {
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

    for (const id in map) {
        const tiles = map[id];
        for (let i = 0; i < tiles.length; i++) {
            for (let j = i + 1; j < tiles.length; j++) {
                const path = findPath(board, tiles[i], tiles[j]);
                if (path) return [tiles[i], tiles[j]];
            }
        }
    }
    return null;
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

function shuffleBoard(board) {
    const newBoard = board.map(row => [...row]);
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
            if (newBoard[r][c] !== 0) newBoard[r][c] = tiles[idx++];
        }
    }
    return newBoard;
}

// ─── Deadlock Fix ─────────────────────────────────────────────────────────────

function checkAndFixDeadlock(board) {
    let pair = hasValidPair(board);
    if (pair === 'win') return { board, isWin: true };
    let b = board;
    let maxTries = 50;
    while (!pair && maxTries > 0) {
        b = shuffleBoard(b);
        pair = hasValidPair(b);
        maxTries--;
    }
    return { board: b, isWin: false };
}

// ─── Remove Pair ──────────────────────────────────────────────────────────────

function removePair(board, p1, p2) {
    const newBoard = board.map(row => [...row]);
    newBoard[p1.r][p1.c] = 0;
    newBoard[p2.r][p2.c] = 0;
    return newBoard;
}

module.exports = {
    generateInitialBoard,
    findPath,
    hasValidPair,
    shuffleBoard,
    checkAndFixDeadlock,
    removePair,
    ROWS,
    COLS,
    R,
    C,
};
