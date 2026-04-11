import { useState, useCallback } from 'react';

const INITIAL_BOARD = [
    ['b_r', 'b_n', 'b_b', 'b_a', 'b_k', 'b_a', 'b_b', 'b_n', 'b_r'],
    [null, null, null, null, null, null, null, null, null],
    [null, 'b_c', null, null, null, null, null, 'b_c', null],
    ['b_p', null, 'b_p', null, 'b_p', null, 'b_p', null, 'b_p'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['r_p', null, 'r_p', null, 'r_p', null, 'r_p', null, 'r_p'],
    [null, 'r_c', null, null, null, null, null, 'r_c', null],
    [null, null, null, null, null, null, null, null, null],
    ['r_r', 'r_n', 'r_b', 'r_a', 'r_k', 'r_a', 'r_b', 'r_n', 'r_r'],
];

// Deep copy board
const cloneBoard = (board) => board.map(row => [...row]);

// Check if position is in Palace
const inPalace = (r, c, color) => {
    if (c < 3 || c > 5) return false;
    if (color === 'w' || color === 'r') return r >= 7 && r <= 9;
    return r >= 0 && r <= 2;
};

// Generate pseudo-legal moves for a piece
const getPseudoLegalMoves = (board, r, c) => {
    const piece = board[r][c];
    if (!piece) return [];
    
    const color = piece[0]; // 'r' or 'b'
    const type = piece[2];  // 'r','n','b','a','k','c','p'
    const moves = [];

    const addMove = (nr, nc) => {
        if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
            const target = board[nr][nc];
            if (!target || target[0] !== color) {
                moves.push({ r: nr, c: nc });
            }
        }
    };

    if (type === 'k') {
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (inPalace(nr, nc, color)) addMove(nr, nc);
        });
    } 
    else if (type === 'a') {
        [[1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (inPalace(nr, nc, color)) addMove(nr, nc);
        });
    }
    else if (type === 'b') { // Elephant
        [[2,2], [2,-2], [-2,2], [-2,-2]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            // Check River bounds (Black: r 0..4, Red: r 5..9)
            if (color === 'b' && nr > 4) return;
            if (color === 'r' && nr < 5) return;
            
            // Eye block check
            const eyeR = r + dr / 2;
            const eyeC = c + dc / 2;
            if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (!board[eyeR][eyeC]) addMove(nr, nc);
            }
        });
    }
    else if (type === 'n') { // Horse
        const jumps = [
            [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
            [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]
        ];
        jumps.forEach(([dr, dc, blockR, blockC]) => {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (!board[r + blockR][c + blockC]) addMove(nr, nc);
            }
        });
    }
    else if (type === 'r') { // Rook
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                const target = board[nr][nc];
                if (!target) {
                    moves.push({ r: nr, c: nc });
                } else {
                    if (target[0] !== color) moves.push({ r: nr, c: nc });
                    break;
                }
                nr += dr; nc += dc;
            }
        });
    }
    else if (type === 'c') { // Cannon
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            let jumped = false;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                const target = board[nr][nc];
                if (!jumped) {
                    if (!target) {
                        moves.push({ r: nr, c: nc });
                    } else {
                        jumped = true;
                    }
                } else {
                    if (target) {
                        if (target[0] !== color) moves.push({ r: nr, c: nc });
                        break;
                    }
                }
                nr += dr; nc += dc;
            }
        });
    }
    else if (type === 'p') { // Pawn
        const dir = color === 'r' ? -1 : 1;
        const crossed = color === 'r' ? r <= 4 : r >= 5;
        addMove(r + dir, c);
        if (crossed) {
            addMove(r, c + 1);
            addMove(r, c - 1);
        }
    }

    return moves;
};

// Check if moving exposes generals to face each other
const isKingsFacing = (board) => {
    let rK, rC, bK, bC;
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            if (board[r][c] === 'r_k') { rK = r; rC = c; }
            if (board[r][c] === 'b_k') { bK = r; bC = c; }
        }
    }
    if (rC !== bC) return false;
    
    let obstacles = 0;
    const minR = Math.min(rK, bK);
    const maxR = Math.max(rK, bK);
    for (let r = minR + 1; r < maxR; r++) {
        if (board[r][rC]) obstacles++;
    }
    return obstacles === 0;
};

// Check if a color is in check
const isCheck = (board, color) => {
    let myK_r = -1, myK_c = -1;
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            if (board[r][c] === `${color}_k`) {
                myK_r = r; myK_c = c; break;
            }
        }
    }
    if (myK_r === -1) return false;

    const oppColor = color === 'r' ? 'b' : 'r';
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            if (board[r][c] && board[r][c][0] === oppColor) {
                const pMoves = getPseudoLegalMoves(board, r, c);
                if (pMoves.some(m => m.r === myK_r && m.c === myK_c)) return true;
            }
        }
    }
    return false;
};

const getLegalMoves = (board, r, c) => {
    const piece = board[r][c];
    if (!piece) return [];
    const pMoves = getPseudoLegalMoves(board, r, c);
    
    // Filter out moves that leave own king in check or cause kings to face
    return pMoves.filter(m => {
        const nextBoard = cloneBoard(board);
        nextBoard[m.r][m.c] = piece;
        nextBoard[r][c] = null;
        if (isKingsFacing(nextBoard)) return false;
        if (isCheck(nextBoard, piece[0])) return false;
        return true;
    });
};

const hasAnyLegalMove = (board, color) => {
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            if (board[r][c] && board[r][c][0] === color) {
                if (getLegalMoves(board, r, c).length > 0) return true;
            }
        }
    }
    return false;
};

export const useXiangqiLogic = (initialTurn = 'r', callbacks = {}) => {
    const [board, setBoard] = useState(INITIAL_BOARD);
    const [turn, setTurn] = useState(initialTurn);
    const [history, setHistory] = useState([]);
    
    // UI selections
    const [selectedPos, setSelectedPos] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [winner, setWinner] = useState(null);

    const checkWinCondition = useCallback((customBoard, currentTurn) => {
        if (!hasAnyLegalMove(customBoard, currentTurn)) {
            setIsGameOver(true);
            setWinner(currentTurn === 'r' ? 'b' : 'r');
        } else if (isCheck(customBoard, currentTurn)) {
            if (callbacks.onCheck) callbacks.onCheck();
        }
    }, [callbacks]);

    const selectPiece = (r, c) => {
        if (isGameOver) return;
        const piece = board[r][c];
        if (piece && piece[0] === turn) {
            setSelectedPos({ r, c });
            setValidMoves(getLegalMoves(board, r, c));
            if (callbacks.onClick) callbacks.onClick();
        } else {
            setSelectedPos(null);
            setValidMoves([]);
            if (piece) { // clicked opponent piece
                if (callbacks.onIllegal) callbacks.onIllegal();
            }
        }
    };

    const movePiece = (toR, toC) => {
        if (!selectedPos || isGameOver) return false;
        
        const move = validMoves.find(m => m.r === toR && m.c === toC);
        if (!move) {
            if (callbacks.onIllegal) callbacks.onIllegal();
            return false;
        }

        const target = board[toR][toC];
        if (target && callbacks.onCapture) callbacks.onCapture();
        else if (!target && callbacks.onMove) callbacks.onMove();

        setBoard(prevBoard => {
            const newBoard = cloneBoard(prevBoard);
            const piece = newBoard[selectedPos.r][selectedPos.c];
            newBoard[toR][toC] = piece;
            newBoard[selectedPos.r][selectedPos.c] = null;
            
            const nextTurn = turn === 'r' ? 'b' : 'r';
            setTurn(nextTurn);
            
            checkWinCondition(newBoard, nextTurn);
            return newBoard;
        });

        setSelectedPos(null);
        setValidMoves([]);
        return true;
    };

    const makeRandomAIMove = (color) => {
        if (isGameOver) return;
        const allMoves = [];
        for (let r = 0; r <= 9; r++) {
            for (let c = 0; c <= 8; c++) {
                if (board[r][c] && board[r][c][0] === color) {
                    const moves = getLegalMoves(board, r, c);
                    moves.forEach(m => allMoves.push({ from: {r, c}, to: m }));
                }
            }
        }
        if (allMoves.length > 0) {
            // Simple logic: prefer captures
            let bestMoves = allMoves.filter(m => board[m.to.r][m.to.c] !== null);
            if (bestMoves.length === 0) bestMoves = allMoves;
            
            const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            
            const target = board[chosenMove.to.r][chosenMove.to.c];
            if (target && callbacks.onCapture) callbacks.onCapture();
            else if (!target && callbacks.onMove) callbacks.onMove();

            setBoard(prevBoard => {
                const newBoard = cloneBoard(prevBoard);
                const piece = newBoard[chosenMove.from.r][chosenMove.from.c];
                newBoard[chosenMove.to.r][chosenMove.to.c] = piece;
                newBoard[chosenMove.from.r][chosenMove.from.c] = null;
                
                const nextTurn = turn === 'r' ? 'b' : 'r';
                setTurn(nextTurn);
                checkWinCondition(newBoard, nextTurn);
                return newBoard;
            });
        }
    };

    return {
        board,
        turn,
        selectedPos,
        validMoves,
        isGameOver,
        winner,
        selectPiece,
        movePiece,
        makeRandomAIMove
    };
};
