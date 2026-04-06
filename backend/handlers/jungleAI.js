/**
 * Jungle Chess (Cờ Thú) AI Logic
 * Uses Minimax with Alpha-Beta Pruning
 */

const PIECE_VALUES = {
    1: 100,  // Rat
    2: 200,  // Cat
    3: 300,  // Dog
    4: 400,  // Wolf
    5: 500,  // Leopard
    6: 800,  // Tiger
    7: 900,  // Lion
    8: 1000, // Elephant
};

const DENS = [
    { x: 3, y: 0, owner: 0 },
    { x: 3, y: 8, owner: 1 }
];

const RIVERS = [
    { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
];

const TRAPS = [
    { x: 2, y: 0, owner: 0 }, { x: 4, y: 0, owner: 0 }, { x: 3, y: 1, owner: 0 },
    { x: 2, y: 8, owner: 1 }, { x: 4, y: 8, owner: 1 }, { x: 3, y: 7, owner: 1 }
];

function isRiver(x, y) {
    return RIVERS.some(r => r.x === x && r.y === y);
}

function getTrapOwner(x, y) {
    const trap = TRAPS.find(t => t.x === x && t.y === y);
    return trap ? trap.owner : null;
}

/**
 * Evaluate board state from perspective of AI (ownerId)
 */
function evaluateBoard(pieces, aiOwnerId, aiOwnerType) {
    let score = 0;
    const oppDen = DENS.find(d => d.owner !== aiOwnerType);

    pieces.forEach(p => {
        const val = PIECE_VALUES[p.type] || 0;
        const distToDen = Math.abs(p.x - oppDen.x) + Math.abs(p.y - oppDen.y);
        const positionalBonus = (15 - distToDen) * 10;

        if (p.ownerId === aiOwnerId) {
            score += val + positionalBonus;
        } else {
            score -= (val + positionalBonus);
        }
    });

    return score;
}

function getPossibleMoves(pieces, playerId, playerType) {
    const moves = [];
    const playerPieces = pieces.filter(p => p.ownerId === playerId);

    playerPieces.forEach(piece => {
        const directions = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}];
        directions.forEach(d => {
            let nx = piece.x + d.x, ny = piece.y + d.y;
            if (nx < 0 || nx >= 7 || ny < 0 || ny >= 9) return;

            // River Jump logic
            if ((piece.type === 6 || piece.type === 7) && isRiver(nx, ny)) {
                let jx = nx, jy = ny;
                while (isRiver(jx, jy)) { jx += d.x; jy += d.y; }
                // Simplified block check: does any piece exist in the river path?
                let blocked = false;
                let tx = piece.x + d.x, ty = piece.y + d.y;
                while (tx !== jx || ty !== jy) {
                    if (pieces.find(p => p.x === tx && p.y === ty)) { blocked = true; break; }
                    tx += d.x; ty += d.y;
                }
                if (!blocked) { nx = jx; ny = jy; } else return;
            } else if (isRiver(nx, ny) && piece.type !== 1) return;

            // Den constraint
            const myDen = DENS.find(den => den.owner === playerType);
            if (nx === myDen.x && ny === myDen.y) return;

            // Target check
            const target = pieces.find(p => p.x === nx && p.y === ny);
            if (target) {
                if (target.ownerId === playerId) return;
                
                // Capture logic
                const trapOwner = getTrapOwner(nx, ny);
                let canCapture = false;
                if (trapOwner !== null && trapOwner !== target.owner) canCapture = true;
                else if (piece.type === 1 && target.type === 8 && !isRiver(piece.x, piece.y)) canCapture = true;
                else if (piece.type >= target.type && !(piece.type === 8 && target.type === 1)) {
                    if (isRiver(piece.x, piece.y) && !isRiver(nx, ny)) canCapture = false;
                    else canCapture = true;
                }
                if (!canCapture) return;
            }

            moves.push({ from: { x: piece.x, y: piece.y }, to: { x: nx, y: ny } });
        });
    });
    return moves;
}

function simulateMove(pieces, move) {
    const newPieces = pieces.filter(p => !(p.x === move.to.x && p.y === move.to.y));
    const movedPiece = newPieces.find(p => p.x === move.from.x && p.y === move.from.y);
    if (movedPiece) {
        movedPiece.x = move.to.x;
        movedPiece.y = move.to.y;
    }
    return newPieces;
}

function minimax(pieces, depth, alpha, beta, isMaximizing, aiId, oppId, aiType, oppType) {
    if (depth === 0) return evaluateBoard(pieces, aiId, aiType);

    const moves = getPossibleMoves(pieces, isMaximizing ? aiId : oppId, isMaximizing ? aiType : oppType);
    if (moves.length === 0) return isMaximizing ? -10000 : 10000;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextState = simulateMove(JSON.parse(JSON.stringify(pieces)), move);
            const evalResult = minimax(nextState, depth - 1, alpha, beta, false, aiId, oppId, aiType, oppType);
            maxEval = Math.max(maxEval, evalResult);
            alpha = Math.max(alpha, evalResult);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nextState = simulateMove(JSON.parse(JSON.stringify(pieces)), move);
            const evalResult = minimax(nextState, depth - 1, alpha, beta, true, aiId, oppId, aiType, oppType);
            minEval = Math.min(minEval, evalResult);
            beta = Math.min(beta, evalResult);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getBestMove(pieces, aiId, oppId, aiType, oppType, difficulty) {
    const depth = difficulty === 'hard' ? 3 : (difficulty === 'medium' ? 2 : 1);
    const moves = getPossibleMoves(pieces, aiId, aiType);
    
    if (difficulty === 'easy' && Math.random() < 0.3) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = null;
    let maxEval = -Infinity;

    for (const move of moves) {
        const nextState = simulateMove(JSON.parse(JSON.stringify(pieces)), move);
        const evalResult = minimax(nextState, depth - 1, -Infinity, Infinity, false, aiId, oppId, aiType, oppType);
        if (evalResult > maxEval) {
            maxEval = evalResult;
            bestMove = move;
        }
    }

    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

module.exports = { getBestMove };
