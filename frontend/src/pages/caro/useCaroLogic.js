import { useState, useEffect, useCallback } from 'react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';
import { useAudio } from '../../utils/useAudio';
import { getFilledCellsCount, checkWinner, getBestAIMove } from './caroAI';

export function useCaroLogic(mode, roomId, difficulty, boardSize, initSymbol) {
    const [board, setBoard] = useState(Array(boardSize).fill(null).map(() => Array(boardSize).fill(0)));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState(null);
    const [winningLine, setWinningLine] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [soloGameCount, setSoloGameCount] = useState(0);

    const [realPlayerSymbol, setRealPlayerSymbol] = useState(() => {
        if (mode === 'solo') return 'X';
        return initSymbol || null;
    });

    useEffect(() => {
        if (mode === 'solo') setRealPlayerSymbol(soloGameCount % 2 === 0 ? 'X' : 'O');
    }, [soloGameCount, mode]);

    const humanNum = mode === 'solo' ? (realPlayerSymbol === 'X' ? 1 : 2) : (realPlayerSymbol === 'X' ? 1 : 2);
    const aiNum = mode === 'solo' ? (realPlayerSymbol === 'X' ? 2 : 1) : null;

    const { playWinSound, playLoseSound } = useAudio();
    const playSound = useCallback((type) => {
        if (type === 'win') playWinSound();
        else playLoseSound();
    }, [playWinSound, playLoseSound]);

    const applyAIMove = useCallback((currentBoard, move) => {
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[move.r][move.c] = aiNum;
        setBoard(newBoard);
        setIsProcessing(false);
        const win = checkWinner(newBoard, move.r, move.c, aiNum, boardSize);
        if (win) {
            setWinner(aiNum);
            setWinningLine(win.line);
            setIsGameOver(true);
            playSound('lose');
        } else {
            const filledCells = getFilledCellsCount(newBoard, boardSize);
            if (filledCells >= boardSize * boardSize) {
                setWinner(-1);
                setIsGameOver(true);
                return;
            }
            setIsXNext(filledCells % 2 === 0);
        }
    }, [aiNum, boardSize, playSound]);

    const makeAIMove = useCallback((currentBoard) => {
        setIsProcessing(true);
        setTimeout(() => {
            const bestMove = getBestAIMove(currentBoard, boardSize, difficulty, aiNum, humanNum);
            if (bestMove) applyAIMove(currentBoard, bestMove);
            else setIsProcessing(false);
        }, 50);
    }, [aiNum, humanNum, boardSize, difficulty, applyAIMove]);

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && !isProcessing) {
            const filledCells = getFilledCellsCount(board, boardSize);
            const currentTurnNum = filledCells % 2 === 0 ? 1 : 2;
            if (currentTurnNum === aiNum) makeAIMove(board);
        }
    }, [board, mode, isGameOver, isProcessing, aiNum, makeAIMove, boardSize]);

    useEffect(() => {
        if (mode === 'multiplayer') {
            socket.on(EVENTS.CARO_GAME_STARTED, ({ playerSymbol: sym }) => {
                if (sym) setRealPlayerSymbol(sym);
            });

            socket.on(EVENTS.CARO_MOVED, ({ r, c, grid }) => {
                setBoard(grid);
                const filledCells = getFilledCellsCount(grid, boardSize);
                setIsXNext(filledCells % 2 === 0);
                const win = checkWinner(grid, r, c, grid[r][c], boardSize);
                if (win) {
                    setWinner(grid[r][c]);
                    setWinningLine(win.line);
                    setIsGameOver(true);
                    const mySymbolNum = realPlayerSymbol === 'X' ? 1 : 2;
                    playSound(grid[r][c] === mySymbolNum ? 'win' : 'lose');
                }
            });

            socket.on(EVENTS.RECEIVE_MESSAGE, (msg) => setMessages(prev => [...prev, msg]));
            socket.on(EVENTS.OPPONENT_DISCONNECTED, () => {
                if (!isGameOver) {
                    setIsGameOver(true);
                    setWinner(realPlayerSymbol === 'X' ? 1 : 2);
                }
            });
        }
        return () => {
            if (mode === 'multiplayer') {
                socket.off(EVENTS.CARO_GAME_STARTED);
                socket.off(EVENTS.CARO_MOVED);
                socket.off(EVENTS.RECEIVE_MESSAGE);
                socket.off(EVENTS.OPPONENT_DISCONNECTED);
            }
        };
    }, [mode, realPlayerSymbol, isGameOver, boardSize, playSound]);

    useEffect(() => {
        return () => { if (roomId) socket.emit(EVENTS.LEAVE_ROOM, roomId); };
    }, [roomId]);

    const handleCellClick = useCallback((r, c) => {
        if (board[r][c] !== 0 || isGameOver || isProcessing) return;

        const filledCells = getFilledCellsCount(board, boardSize);
        const currentTurnNum = filledCells % 2 === 0 ? 1 : 2;

        if (mode === 'solo' && currentTurnNum !== humanNum) return;
        if (mode === 'multiplayer' && currentTurnNum !== humanNum) return;

        setIsProcessing(true);
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = currentTurnNum;
        setBoard(newBoard);

        const win = checkWinner(newBoard, r, c, currentTurnNum, boardSize);
        if (win) {
            setWinner(currentTurnNum);
            setWinningLine(win.line);
            setIsGameOver(true);
            setIsProcessing(false);
            playSound(currentTurnNum === humanNum ? 'win' : 'lose');
        } else {
            const filled = getFilledCellsCount(newBoard, boardSize);
            if (filled >= boardSize * boardSize) {
                setWinner(-1);
                setIsGameOver(true);
                setIsProcessing(false);
                return;
            }
            setIsXNext(!isXNext);
            if (mode === 'multiplayer') {
                setIsProcessing(false);
                socket.emit(EVENTS.CARO_MOVE, { r, c, roomId, grid: newBoard });
            } else {
                setIsProcessing(false);
            }
        }
    }, [board, isGameOver, isProcessing, mode, humanNum, isXNext, roomId, boardSize, playSound]);

    const resetGame = useCallback(() => {
        setBoard(Array(boardSize).fill(null).map(() => Array(boardSize).fill(0)));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        setIsGameOver(false);
        setIsProcessing(false);
        if (mode === 'solo') setSoloGameCount(prev => prev + 1);
    }, [boardSize, mode]);

    const sendMessage = (inputMessage) => {
        if (!inputMessage.trim()) return;
        const msgObj = { message: inputMessage, sender: socket.id };
        socket.emit(EVENTS.SEND_MESSAGE, { roomId, ...msgObj });
        setMessages(prev => [...prev, msgObj]);
    };

    return {
        board, isXNext, winner, winningLine, isGameOver, isProcessing,
        messages, realPlayerSymbol, humanNum, soloGameCount,
        handleCellClick, resetGame, sendMessage
    };
}
