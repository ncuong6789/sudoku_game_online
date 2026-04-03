export const getFilledCellsCount = (grid, boardSize) => {
    let count = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (grid[r][c] !== 0) count++;
        }
    }
    return count;
};

export const checkWinner = (grid, r, c, player, boardSize) => {
    const winCount = boardSize === 3 ? 3 : 5;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
        let count = 1;
        let line = [{ r, c }];
        
        for (let i = 1; i < winCount; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && grid[nr][nc] === player) {
                count++; line.push({ r: nr, c: nc });
            } else break;
        }
        for (let i = 1; i < winCount; i++) {
            const nr = r - dr * i, nc = c - dc * i;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && grid[nr][nc] === player) {
                count++; line.push({ r: nr, c: nc });
            } else break;
        }
        if (count >= winCount) return { player, line };
    }
    return null;
};

const evaluateBoardForMoves = (grid, moveR, moveC, player, boardSize) => {
    let score = 0;
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let open3Count = 0;
    let open4Count = 0;

    for (const [dr, dc] of directions) {
        let count = 1;
        let blocked = 0;

        let i = 1;
        while (true) {
            const nr = moveR + dr * i, nc = moveC + dc * i;
            if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) { blocked++; break; }
            if (grid[nr][nc] === player) { count++; i++; }
            else if (grid[nr][nc] !== 0) { blocked++; break; }
            else break;
        }
        let j = 1;
        while (true) {
            const nr = moveR - dr * j, nc = moveC - dc * j;
            if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) { blocked++; break; }
            if (grid[nr][nc] === player) { count++; j++; }
            else if (grid[nr][nc] !== 0) { blocked++; break; }
            else break;
        }

        if (count >= 5) score += 1000000;
        else if (count === 4) {
            if (blocked === 0) { score += 100000; open4Count++; }
            else if (blocked === 1) score += 10000;
        } else if (count === 3) {
            if (blocked === 0) { score += 5000; open3Count++; }
            else if (blocked === 1) score += 100;
        } else if (count === 2) {
            if (blocked === 0) score += 50;
            else if (blocked === 1) score += 5;
        }
    }

    if (open4Count >= 2) score += 500000;
    else if (open4Count >= 1 && open3Count >= 1) score += 100000;
    else if (open3Count >= 2) score += 50000;

    return score;
};

const evaluateBoardTotal = (grid, boardSize, aiNum, humanNum) => {
    let totalScore = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (grid[r][c] === aiNum) totalScore += evaluateBoardForMoves(grid, r, c, aiNum, boardSize);
            else if (grid[r][c] === humanNum) totalScore -= evaluateBoardForMoves(grid, r, c, humanNum, boardSize) * 1.2;
        }
    }
    return totalScore;
};

const minimax = (grid, depth, alpha, beta, isMaximizing, boardSize, aiNum, humanNum) => {
    let currentScore = evaluateBoardTotal(grid, boardSize, aiNum, humanNum);
    if (depth === 0 || Math.abs(currentScore) >= 1000000) return currentScore;

    const candidates = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (grid[r][c] === 0) {
                let isNear = false;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && grid[nr][nc] !== 0) {
                            isNear = true; break;
                        }
                    }
                    if (isNear) break;
                }
                if (isNear) {
                    grid[r][c] = isMaximizing ? aiNum : humanNum;
                    const tempScore = evaluateBoardForMoves(grid, r, c, isMaximizing ? aiNum : humanNum, boardSize)
                        + evaluateBoardForMoves(grid, r, c, isMaximizing ? humanNum : aiNum, boardSize) * 0.8;
                    grid[r][c] = 0;
                    candidates.push({ r, c, score: tempScore });
                }
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, 15);
    if (topCandidates.length === 0) return 0;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const { r, c } of topCandidates) {
            grid[r][c] = aiNum;
            const ev = minimax(grid, depth - 1, alpha, beta, false, boardSize, aiNum, humanNum);
            grid[r][c] = 0;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const { r, c } of topCandidates) {
            grid[r][c] = humanNum;
            const ev = minimax(grid, depth - 1, alpha, beta, true, boardSize, aiNum, humanNum);
            grid[r][c] = 0;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

export const getBestAIMove = (currentBoard, boardSize, difficulty, aiNum, humanNum) => {
    const boardCopy = currentBoard.map(row => [...row]);
    let depth = 1;
    if (boardSize === 3) depth = difficulty === 'Hard' ? 6 : 3;
    else depth = difficulty === 'Hard' ? 3 : (difficulty === 'Medium' ? 2 : 1); 

    let bestScore = -Infinity;
    let bestMove = null;

    const candidates = [];
    let emptyCount = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (boardCopy[r][c] === 0) {
                emptyCount++;
                let isNear = false;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && boardCopy[nr][nc] !== 0) {
                            isNear = true; break;
                        }
                    }
                    if (isNear) break;
                }
                if (isNear) {
                    boardCopy[r][c] = aiNum;
                    const centerDist = Math.abs(r - Math.floor(boardSize / 2)) + Math.abs(c - Math.floor(boardSize / 2));
                    const heuristicVal = evaluateBoardForMoves(boardCopy, r, c, aiNum, boardSize)
                        + evaluateBoardForMoves(boardCopy, r, c, humanNum, boardSize) * 1.2
                        - centerDist * 0.5
                        + Math.random() * 5; 
                    boardCopy[r][c] = 0;
                    candidates.push({ r, c, score: heuristicVal });
                }
            }
        }
    }

    if (emptyCount === boardSize * boardSize) {
        const center = Math.floor(boardSize / 2);
        const offsetR = Math.floor(Math.random() * 3) - 1;
        const offsetC = Math.floor(Math.random() * 3) - 1;
        bestMove = { r: center + offsetR, c: center + offsetC };
    } else {
        candidates.sort((a, b) => b.score - a.score);
        const searchCandidates = candidates.slice(0, 15);

        for (const { r, c } of searchCandidates) {
            boardCopy[r][c] = aiNum;
            const score = minimax(boardCopy, depth - 1, -Infinity, Infinity, false, boardSize, aiNum, humanNum);
            boardCopy[r][c] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = { r, c };
            }
        }
    }
    return bestMove;
};
