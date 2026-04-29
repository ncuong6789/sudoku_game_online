import { useState, useCallback, useEffect } from 'react';
import { getBestMoveAsync, getEvalScore } from './xiangqiAI';
import { socket } from '../../utils/socket';

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

const cloneBoard = (board) => board.map(row => [...row]);

const inPalace = (r, c, color) => {
    if (c < 3 || c > 5) return false;
    if (color === 'w' || color === 'r') return r >= 7 && r <= 9;
    return r >= 0 && r <= 2;
};

const getPseudoLegalMoves = (board, r, c) => {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const type = piece[2];
    const moves = [];

    const addMove = (nr, nc) => {
        if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
            const target = board[nr][nc];
            if (!target || target[0] !== color) moves.push({ r: nr, c: nc });
        }
    };

    if (type === 'k') {
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (inPalace(nr, nc, color)) addMove(nr, nc);
        });
    } else if (type === 'a') {
        [[1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (inPalace(nr, nc, color)) addMove(nr, nc);
        });
    } else if (type === 'b') {
        [[2,2], [2,-2], [-2,2], [-2,-2]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (color === 'b' && nr > 4) return;
            if (color === 'r' && nr < 5) return;
            const eyeR = r + dr / 2;
            const eyeC = c + dc / 2;
            if (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                if (!board[eyeR][eyeC]) addMove(nr, nc);
            }
        });
    } else if (type === 'n') {
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
    } else if (type === 'r') {
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                const target = board[nr][nc];
                if (!target) { moves.push({ r: nr, c: nc }); }
                else { if (target[0] !== color) moves.push({ r: nr, c: nc }); break; }
                nr += dr; nc += dc;
            }
        });
    } else if (type === 'c') {
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            let jumped = false;
            while (nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8) {
                const target = board[nr][nc];
                if (!jumped) {
                    if (!target) moves.push({ r: nr, c: nc });
                    else jumped = true;
                } else {
                    if (target) { if (target[0] !== color) moves.push({ r: nr, c: nc }); break; }
                }
                nr += dr; nc += dc;
            }
        });
    } else if (type === 'p') {
        const dir = color === 'r' ? -1 : 1;
        const crossed = color === 'r' ? r <= 4 : r >= 5;
        addMove(r + dir, c);
        if (crossed) { addMove(r, c + 1); addMove(r, c - 1); }
    }

    return moves;
};

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
    for (let r = minR + 1; r < maxR; r++) { if (board[r][rC]) obstacles++; }
    return obstacles === 0;
};

const isCheck = (board, color) => {
    let myK_r = -1, myK_c = -1;
    for (let r = 0; r <= 9; r++) {
        for (let c = 0; c <= 8; c++) {
            if (board[r][c] === `${color}_k`) { myK_r = r; myK_c = c; break; }
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

const PIECE_TEXT = {
    'r_k': '帥', 'r_a': '仕', 'r_b': '相', 'r_n': '傌', 'r_r': '俥', 'r_c': '炮', 'r_p': '兵',
    'b_k': '將', 'b_a': '士', 'b_b': '象', 'b_n': '馬', 'b_r': '車', 'b_c': '砲', 'b_p': '卒',
};

function formatMoveNotation(piece, fromR, fromC, toR, toC, captured) {
    const pName = PIECE_TEXT[piece] || '?';
    const colNames = 'abcdefghi';
    const from = `${colNames[fromC]}${9 - fromR}`;
    const to = `${colNames[toC]}${9 - toR}`;
    const cap = captured ? 'x' : '-';
    return `${pName} ${from}${cap}${to}`;
}

export const useXiangqiLogic = (initialTurn = 'r', callbacks = {}, mode = 'solo', roomId = null) => {
    const [board, setBoard] = useState(INITIAL_BOARD);
    const [turn, setTurn] = useState(initialTurn);
    const [history, setHistory] = useState([]);
    const [selectedPos, setSelectedPos] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [inCheckColor, setInCheckColor] = useState(null);
    const [moveList, setMoveList] = useState([]);
    const [evalScore, setEvalScore] = useState(0);
    const [hintMove, setHintMove] = useState(null);

    // Multiplayer socket sync will be moved below.

    const checkWinCondition = useCallback((customBoard, currentTurn) => {
        if (!hasAnyLegalMove(customBoard, currentTurn)) {
            setIsGameOver(true);
            setWinner(currentTurn === 'r' ? 'b' : 'r');
            setInCheckColor(null);
        } else if (isCheck(customBoard, currentTurn)) {
            setInCheckColor(currentTurn);
            if (callbacks.onCheck) callbacks.onCheck();
        } else {
            setInCheckColor(null);
        }
    }, [callbacks]);

    const updateEval = useCallback((currentBoard, currentTurn) => {
        const score = getEvalScore(currentBoard, currentTurn);
        setEvalScore(score);
    }, []);

    // Multiplayer socket sync
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ from, to, board: newBoard }) => {
                setBoard(newBoard);
                const piece = newBoard[to.r][to.c];
                const nextTurn = turn === 'r' ? 'b' : 'r';
                // Determine if capture happened (we use the received board)
                if (callbacks.onMove) callbacks.onMove();
                setTurn(prevTurn => prevTurn === 'r' ? 'b' : 'r');
                setSelectedPos(null);
                setValidMoves([]);
                setHintMove(null);
                // Check game state after opponent move
                setTimeout(() => {
                    setBoard(b => {
                        checkWinCondition(b, nextTurn);
                        updateEval(b, nextTurn);
                        return b;
                    });
                }, 50);
            };

            const handleOpponentDisconnect = () => {
                if (!isGameOver) {
                    setIsGameOver(true);
                    setWinner(callbacks.myColor || 'r');
                }
            };

            socket.on('xiangqiMoved', handleOpponentMove);
            socket.on('opponentDisconnected', handleOpponentDisconnect);
            return () => {
                socket.off('xiangqiMoved', handleOpponentMove);
                socket.off('opponentDisconnected', handleOpponentDisconnect);
            };
        }
    }, [mode, roomId, turn, isGameOver, callbacks, checkWinCondition, updateEval]);

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
            if (piece) { if (callbacks.onIllegal) callbacks.onIllegal(); }
        }
    };

    const movePiece = (toR, toC) => {
        if (!selectedPos || isGameOver) return false;
        const move = validMoves.find(m => m.r === toR && m.c === toC);
        if (!move) {
            if (callbacks.onIllegal) callbacks.onIllegal();
            return false;
        }

        const fromR = selectedPos.r;
        const fromC = selectedPos.c;
        const piece = board[fromR][fromC];
        const target = board[toR][toC];

        if (target && callbacks.onCapture) callbacks.onCapture();
        else if (!target && callbacks.onMove) callbacks.onMove();

        setBoard(prevBoard => {
            const newBoard = cloneBoard(prevBoard);
            newBoard[toR][toC] = piece;
            newBoard[fromR][fromC] = null;

            setHistory(prev => [...prev, {
                board: cloneBoard(prevBoard),
                turn,
                inCheckColor,
            }]);

            const notation = formatMoveNotation(piece, fromR, fromC, toR, toC, target);
            setMoveList(prev => [...prev, { notation, color: piece[0], captured: target }]);

            const nextTurn = turn === 'r' ? 'b' : 'r';
            setTurn(nextTurn);
            checkWinCondition(newBoard, nextTurn);
            updateEval(newBoard, nextTurn);
            return newBoard;
        });

        setSelectedPos(null);
        setValidMoves([]);
        setHintMove(null);

        // Emit move to server in multiplayer
        if (mode === 'multiplayer' && roomId) {
            const newBoard = cloneBoard(board);
            newBoard[toR][toC] = board[fromR][fromC];
            newBoard[fromR][fromC] = null;
            socket.emit('xiangqiMove', { roomId, from: { r: fromR, c: fromC }, to: { r: toR, c: toC }, board: newBoard });
        }

        return true;
    };

    const makeAIMove = (color, difficulty = 'Medium') => {
        if (isGameOver) return;
        getBestMoveAsync(board, color, getLegalMoves, cloneBoard, isCheck, isKingsFacing, difficulty).then(chosenMove => {
            if (!chosenMove) return;

            const fromR = chosenMove.from.r;
            const fromC = chosenMove.from.c;
            const toR = chosenMove.to.r;
            const toC = chosenMove.to.c;
            const piece = board[fromR][fromC];
            const target = board[toR][toC];

            if (target && callbacks.onCapture) callbacks.onCapture();
            else if (!target && callbacks.onMove) callbacks.onMove();

            setBoard(prevBoard => {
                const newBoard = cloneBoard(prevBoard);
                newBoard[toR][toC] = piece;
                newBoard[fromR][fromC] = null;

                setHistory(prev => [...prev, {
                    board: cloneBoard(prevBoard),
                    turn,
                    inCheckColor,
                }]);

                const notation = formatMoveNotation(piece, fromR, fromC, toR, toC, target);
                setMoveList(prev => [...prev, { notation, color: piece[0], captured: target }]);

                const nextTurn = turn === 'r' ? 'b' : 'r';
                setTurn(nextTurn);
                checkWinCondition(newBoard, nextTurn);
                updateEval(newBoard, nextTurn);
                return newBoard;
            });
        });
    };

    const undoMove = (count = 2) => {
        if (history.length < count) return false;
        const targetState = history[history.length - count];
        setBoard(targetState.board);
        setTurn(targetState.turn);
        setInCheckColor(targetState.inCheckColor);
        setHistory(prev => prev.slice(0, -count));
        setMoveList(prev => prev.slice(0, -count));
        setIsGameOver(false);
        setWinner(null);
        setSelectedPos(null);
        setValidMoves([]);
        setHintMove(null);
        updateEval(targetState.board, targetState.turn);
        return true;
    };

    const getHint = () => {
        if (isGameOver || turn !== (callbacks.myColor || 'r')) return;
        getBestMoveAsync(board, turn, getLegalMoves, cloneBoard, isCheck, isKingsFacing, 3).then(chosenMove => {
            if (chosenMove) {
                setHintMove({ from: chosenMove.from, to: chosenMove.to });
                setTimeout(() => setHintMove(null), 5000);
            }
        });
    };

    return {
        board,
        turn,
        selectedPos,
        validMoves,
        isGameOver,
        winner,
        inCheckColor,
        moveList,
        evalScore,
        hintMove,
        selectPiece,
        movePiece,
        makeAIMove,
        undoMove,
        getHint,
    };
};
