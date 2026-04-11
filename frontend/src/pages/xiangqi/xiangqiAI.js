// Piece base values
const PIECE_VALUES = {
    'k': 10000,
    'r': 900,
    'c': 450,
    'n': 400,
    'a': 20,
    'b': 20,
    'p': 10
};

// Evaluate board state for a given color
function evaluateBoard(board, color) {
    let score = 0;
    const oppColor = color === 'r' ? 'b' : 'r';

    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const pColor = piece[0];
                const type = piece[2];
                let value = PIECE_VALUES[type] || 0;

                // Adjust pawn value if crossed river
                if (type === 'p') {
                    if (pColor === 'r' && r <= 4) value += 10; // Red crossed (goes up to index 4)
                    else if (pColor === 'b' && r >= 5) value += 10; // Black crossed (goes down to index 5)
                    
                    // Extra bonus for approaching center
                    if (c >= 3 && c <= 5) value += 5;
                }
                
                // Bonus for centralizing horses and cannons
                if (type === 'n' || type === 'c') {
                    if (c >= 2 && c <= 6) value += 5;
                    if (r >= 2 && r <= 7) value += 5;
                }

                if (pColor === color) {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }
    return score;
}

// Generate all legal moves for a given color
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
    
    // Simple move ordering: captures first to improve alpha-beta pruning efficiency
    moves.sort((a, b) => {
        const targetA = board[a.to.r][a.to.c];
        const targetB = board[b.to.r][b.to.c];
        if (targetA && !targetB) return -1;
        if (!targetA && targetB) return 1;
        
        // If both capture, value the higher value victim
        if (targetA && targetB) {
            const valA = PIECE_VALUES[targetA[2]] || 0;
            const valB = PIECE_VALUES[targetB[2]] || 0;
            return valB - valA;
        }
        return 0;
    });
    
    return moves;
}

export function getBestMoveAsync(board, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, depth = 3) {
    return new Promise((resolve) => {
        // Run asynchronously so UI doesn't freeze completely
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

    // For a very shallow depth, just pick capture if it's identical
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
        return evaluateBoard(board, color);
    }

    const allMoves = generateAllMoves(board, color, getLegalMoves);
    if (allMoves.length === 0) {
        // No legal moves = lost
        return -Infinity;
    }

    let maxScore = -Infinity;
    for (const move of allMoves) {
        const nextBoard = cloneBoard(board);
        nextBoard[move.to.r][move.to.c] = move.piece;
        nextBoard[move.from.r][move.from.c] = null;

        const score = -minimax(nextBoard, depth - 1, -beta, -alpha, color === 'r' ? 'b' : 'r', getLegalMoves, cloneBoard, isCheck, isKingsFacing);
        
        if (score > maxScore) {
            maxScore = score;
        }
        alpha = Math.max(alpha, score);
        if (alpha >= beta) {
            break; // Beta cut-off
        }
    }
    return maxScore;
}
