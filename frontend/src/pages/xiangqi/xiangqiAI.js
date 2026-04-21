const PIECE_VALUES = {
    'k': 10000,
    'r': 900,
    'c': 450,
    'n': 400,
    'b': 200,
    'a': 200,
    'p': 80
};

const PAWN_CROSS_BONUS = 60;
const KNIGHT_CENTER_BONUS = [
    [0, -4, 0, 0, 0, 0, 0, -4, 0],
    [2, 8, 12, 14, 14, 14, 12, 8, 2],
    [4, 12, 16, 20, 20, 20, 16, 12, 4],
    [4, 12, 20, 24, 24, 24, 20, 12, 4],
    [4, 16, 20, 24, 24, 24, 20, 16, 4],
    [4, 16, 20, 24, 24, 24, 20, 16, 4],
    [4, 12, 20, 24, 24, 24, 20, 12, 4],
    [4, 12, 16, 20, 20, 20, 16, 12, 4],
    [2, 8, 12, 14, 14, 14, 12, 8, 2],
    [0, -4, 0, 0, 0, 0, 0, -4, 0],
];

const CANNON_BONUS = [
    [0, 0, 4, 8, 8, 8, 4, 0, 0],
    [0, 4, 8, 12, 12, 12, 8, 4, 0],
    [0, 4, 8, 16, 16, 16, 8, 4, 0],
    [0, 4, 12, 16, 20, 16, 12, 4, 0],
    [0, 4, 12, 16, 20, 16, 12, 4, 0],
    [0, 4, 12, 16, 20, 16, 12, 4, 0],
    [0, 4, 8, 16, 16, 16, 8, 4, 0],
    [0, 4, 8, 12, 12, 12, 8, 4, 0],
    [0, 0, 4, 8, 8, 8, 4, 0, 0],
    [0, 0, 4, 8, 8, 8, 4, 0, 0],
];

const ROOK_BONUS = [
    [6, 8, 6, 12, 12, 12, 6, 8, 6],
    [6, 10, 12, 18, 18, 18, 12, 10, 6],
    [4, 12, 14, 20, 20, 20, 14, 12, 4],
    [4, 12, 16, 22, 22, 22, 16, 12, 4],
    [2, 8, 12, 16, 16, 16, 12, 8, 2],
    [2, 8, 12, 16, 16, 16, 12, 8, 2],
    [4, 12, 16, 22, 22, 22, 16, 12, 4],
    [4, 12, 14, 20, 20, 20, 14, 12, 4],
    [6, 10, 12, 18, 18, 18, 12, 10, 6],
    [6, 8, 6, 12, 12, 12, 6, 8, 6],
];

function evaluateBoard(board, color) {
    let score = 0;

    let myKingR = -1, myKingC = -1;
    let oppKingR = -1, oppKingC = -1;

    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const pColor = piece[0];
            const type = piece[2];
            let value = PIECE_VALUES[type] || 0;

            if (type === 'n') value += KNIGHT_CENTER_BONUS[r][c];
            if (type === 'c') value += CANNON_BONUS[r][c];
            if (type === 'r') value += ROOK_BONUS[r][c];

            if (type === 'p') {
                if (pColor === 'r' && r <= 4) value += PAWN_CROSS_BONUS;
                else if (pColor === 'b' && r >= 5) value += PAWN_CROSS_BONUS;
                if (c >= 3 && c <= 5) value += 15;
            }

            if (type === 'a' || type === 'b') {
                const inPalace = (c >= 3 && c <= 5);
                if (pColor === 'r' && inPalace && r >= 7) value += 10;
                if (pColor === 'b' && inPalace && r <= 2) value += 10;
            }

            if (type === 'k') {
                if (pColor === color) { myKingR = r; myKingC = c; }
                else { oppKingR = r; oppKingC = c; }
            }

            if (pColor === color) score += value;
            else score -= value;
        }
    }

    if (myKingR >= 0 && oppKingR >= 0) {
        const fileDist = Math.abs(myKingC - oppKingC);
        if (fileDist <= 1) score += 20;
    }

    let myMobility = 0;
    let oppMobility = 0;
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            if (piece[0] === color) myMobility++;
            else oppMobility++;
        }
    }
    score += (myMobility - oppMobility) * 3;

    return score;
}

function generateAllMoves(board, color, getLegalMoves) {
    const moves = [];
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            const piece = board[r][c];
            if (piece && piece[0] === color) {
                const legalMoves = getLegalMoves(board, r, c);
                for (const m of legalMoves) {
                    moves.push({ from: { r, c }, to: m, piece });
                }
            }
        }
    }

    moves.sort((a, b) => {
        const targetA = board[a.to.r][a.to.c];
        const targetB = board[b.to.r][b.to.c];
        if (targetA && !targetB) return -1;
        if (!targetA && targetB) return 1;
        if (targetA && targetB) {
            const valA = PIECE_VALUES[targetA[2]] || 0;
            const valB = PIECE_VALUES[targetB[2]] || 0;
            return valB - valA;
        }
        return 0;
    });

    return moves;
}

const DIFFICULTY_DEPTH = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
    Expert: 4,
};

export function getBestMoveAsync(board, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, depthOrDiff = 3) {
    const depth = typeof depthOrDiff === 'string'
        ? (DIFFICULTY_DEPTH[depthOrDiff] || 2)
        : depthOrDiff;

    return new Promise((resolve) => {
        setTimeout(() => {
            const best = getBestMove(board, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, depth);
            resolve(best);
        }, 10);
    });
}

export function getBestMove(board, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, depth) {
    const oppColor = color === 'r' ? 'b' : 'r';

    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const allMoves = generateAllMoves(board, color, getLegalMoves);
    if (allMoves.length === 0) return null;

    for (const move of allMoves) {
        const nextBoard = cloneBoard(board);
        nextBoard[move.to.r][move.to.c] = move.piece;
        nextBoard[move.from.r][move.from.c] = null;

        const score = -minimax(nextBoard, depth - 1, -beta, -alpha, oppColor, getLegalMoves, cloneBoard, isCheck, isKingsFacing);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        alpha = Math.max(alpha, score);
    }

    return bestMove || allMoves[Math.floor(Math.random() * allMoves.length)];
}

function minimax(board, depth, alpha, beta, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing) {
    if (depth === 0) {
        return quiesce(board, alpha, beta, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, 3);
    }

    const allMoves = generateAllMoves(board, color, getLegalMoves);
    if (allMoves.length === 0) {
        return -99999;
    }

    let maxScore = -Infinity;
    for (const move of allMoves) {
        const nextBoard = cloneBoard(board);
        nextBoard[move.to.r][move.to.c] = move.piece;
        nextBoard[move.from.r][move.from.c] = null;

        const score = -minimax(nextBoard, depth - 1, -beta, -alpha, color === 'r' ? 'b' : 'r', getLegalMoves, cloneBoard, isCheck, isKingsFacing);

        if (score > maxScore) maxScore = score;
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
    }
    return maxScore;
}

function quiesce(board, alpha, beta, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, maxDepth) {
    const standPat = evaluateBoard(board, color);
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    if (maxDepth <= 0) return standPat;

    const allMoves = generateAllMoves(board, color, getLegalMoves);
    const captures = allMoves.filter(m => board[m.to.r][m.to.c] !== null);

    for (const move of captures) {
        const nextBoard = cloneBoard(board);
        nextBoard[move.to.r][move.to.c] = move.piece;
        nextBoard[move.from.r][move.from.c] = null;

        const score = -quiesce(nextBoard, -beta, -alpha, color === 'r' ? 'b' : 'r', getLegalMoves, cloneBoard, isCheck, isKingsFacing, maxDepth - 1);

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

export function getEvalScore(board, color) {
    return evaluateBoard(board, color);
}
