import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { socket } from '../../utils/socket';

export function useChessLogic(mode, roomId, difficulty, initialColor, callbacks) {
    const {
        onClick,
        onMove,
        onCapture,
        onCheck,
        onIllegal,
        myColor
    } = callbacks;

    const [game, setGame] = useState(new Chess());
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null); // 'w', 'b', or 'draw'
    const [moveHistory, setMoveHistory] = useState([]);
    
    // UI selections
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [validMoves, setValidMoves] = useState([]);

    // Stockfish
    const engine = useRef(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [evalScore, setEvalScore] = useState(0); // Centipawns relative to White
    const [hintMove, setHintMove] = useState(null);
    const [isThinkingHint, setIsThinkingHint] = useState(false);
    const [hintSuggestions, setHintSuggestions] = useState(null);

    // Sync game state to derived states natively
    useEffect(() => {
        const history = game.history({ verbose: true });
        setMoveHistory(history);

        if (game.isCheckmate()) {
            setGameOver(true);
            setWinner(game.turn() === 'w' ? 'b' : 'w');
        } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
            setGameOver(true);
            setWinner('draw');
        } else {
            setGameOver(false);
            setWinner(null);
        }
    }, [game]);

    // Multiplayer socket sync
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ move, fen }) => {
                setGame((g) => {
                    const newGame = new Chess();
                    newGame.loadPgn(g.pgn());
                    if (move) {
                        try {
                            newGame.move(move);
                            onMove?.();
                            return newGame;
                        } catch (e) { console.error("Sync error, fallback to FEN"); }
                    }
                    try { newGame.load(fen); } catch (e) { return g; }
                    onMove?.();
                    return newGame;
                });
            };
            const handleOpponentDisconnect = () => {
                if (!gameOver) {
                    setGameOver(true);
                    setWinner(myColor); // Win by default
                }
            };
            socket.on('chessMoved', handleOpponentMove);
            socket.on('opponentDisconnected', handleOpponentDisconnect);
            return () => {
                socket.off('chessMoved', handleOpponentMove);
                socket.off('opponentDisconnected', handleOpponentDisconnect);
            };
        }
    }, [mode, roomId, gameOver, myColor, onMove]);

    // Stockfish Init
    useEffect(() => {
        const stockfishWorker = new Worker(
            URL.createObjectURL(
                new Blob([`importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`], { type: 'application/javascript' })
            )
        );

        stockfishWorker.onmessage = (e) => {
            const line = e.data;
            if (line === 'readyok') {
                setIsEngineReady(true);
            } 
            // Continuously read centipawn eval for the EvalBar
            else if (line.startsWith('info depth')) {
                const scoreMatch = line.match(/score cp (-?\d+)/);
                const mateMatch = line.match(/score mate (-?\d+)/);
                let score = 0;
                
                if (scoreMatch) {
                    score = parseInt(scoreMatch[1]);
                } else if (mateMatch) {
                    score = parseInt(mateMatch[1]) > 0 ? 10000 : -10000;
                }
                
                // Score is from engine's perspective
                const turnModifier = game.turn() === 'w' ? 1 : -1;
                setEvalScore(score * turnModifier);
            }
            
            else if (line.startsWith('bestmove')) {
                const moveMatch = line.match(/bestmove\s([a-h][1-8][a-h][1-8])(n|b|r|q)?/);
                if (moveMatch && mode === 'solo' && game.turn() !== myColor) {
                    const from = moveMatch[1].substring(0, 2);
                    const to = moveMatch[1].substring(2, 4);
                    const promotion = moveMatch[2] || 'q';
                    
                    setGame((g) => {
                        const newGame = new Chess();
                        newGame.loadPgn(g.pgn());
                        try {
                            const result = newGame.move({ from, to, promotion });
                            if (result) {
                                if (result.flags.includes('c')) onCapture?.();
                                else onMove?.();
                                if (newGame.isCheck()) onCheck?.();
                            }
                            return newGame;
                        } catch (err) { return g; }
                    });
                }
            }
        };

        stockfishWorker.postMessage('uci');
        stockfishWorker.postMessage('isready');
        const skillLevel = difficulty === 'Easy' ? 0 : difficulty === 'Medium' ? 10 : 20;
        stockfishWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        engine.current = stockfishWorker;

        return () => {
            stockfishWorker.terminate();
        };
    }, [difficulty, mode, myColor, game, onMove, onCapture, onCheck]);

    // Keep evaluating position when someone moves to update EvalBar
    useEffect(() => {
        if (engine.current && isEngineReady && !gameOver) {
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth 12`); // continuous eval
        }
    }, [game.fen(), isEngineReady, gameOver]);

    const selectSquare = useCallback((sq) => {
        if (gameOver || game.turn() !== myColor) return;
        
        const piece = game.get(sq);
        if (piece && piece.color === myColor) {
            setSelectedSquare(sq);
            const moves = game.moves({ square: sq, verbose: true });
            setValidMoves(moves.map(m => m.to));
            onClick?.();
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
        }
    }, [game, myColor, gameOver, onClick]);

    const movePiece = useCallback((toSquare) => {
        if (!selectedSquare || gameOver || game.turn() !== myColor) return false;

        const newGame = new Chess();
        newGame.loadPgn(game.pgn());
        const moves = newGame.moves({ square: selectedSquare, verbose: true });
        const foundMove = moves.find(m => m.to === toSquare);

        if (!foundMove) {
            onIllegal?.();
            setSelectedSquare(null);
            setValidMoves([]);
            return false;
        }

        const moveObj = { from: selectedSquare, to: toSquare };
        if (foundMove.promotion) moveObj.promotion = 'q';

        try {
            const result = newGame.move(moveObj);
            setGame(newGame);
            setSelectedSquare(null);
            setValidMoves([]);
            setHintMove(null);
            setHintSuggestions(null);

            if (result.flags.includes('c')) onCapture?.();
            else onMove?.();
            if (newGame.isCheck()) onCheck?.();

            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, move: moveObj, fen: newGame.fen() });
            }
            return true;
        } catch (e) {
            console.error('Lỗi di chuyển: ', e);
            onIllegal?.();
            return false;
        }
    }, [game, selectedSquare, gameOver, myColor, mode, roomId, onMove, onCapture, onCheck, onIllegal]);

    const makeAIMove = useCallback(() => {
        if (engine.current && isEngineReady && !gameOver) {
            const depth = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 8 : 15;
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth ${depth}`);
        }
    }, [game, isEngineReady, difficulty, gameOver]);

    const getHint = useCallback(() => {
        if (engine.current && isEngineReady && !gameOver && game.turn() === myColor) {
            setIsThinkingHint(true);
            setHintMove(null);
            setHintSuggestions(null);
            
            const suggestions = [];
            let handler = null;
            
            handler = (e) => {
                const line = e.data;
                
                if (line.startsWith('info depth')) {
                    const scoreMatch = line.match(/score cp (-?\d+)/);
                    const pvMatch = line.match(/pv\s+([a-h][1-8][a-h][1-8])/);
                    
                    if (scoreMatch && pvMatch && suggestions.length < 5) {
                        const score = parseInt(scoreMatch[1]);
                        const moveStr = pvMatch[1];
                        const move = { from: moveStr.substring(0, 2), to: moveStr.substring(2, 4) };
                        if (!suggestions.find(s => s.from === move.from && s.to === move.to)) {
                            suggestions.push({ ...move, score });
                        }
                    }
                }
                
                if (line.startsWith('bestmove')) {
                    const moveMatch = line.match(/bestmove\s([a-h][1-8][a-h][1-8])(n|b|r|q)?/);
                    if (moveMatch) {
                        const moveStr = moveMatch[1];
                        const bestMove = { from: moveStr.substring(0, 2), to: moveStr.substring(2, 4) };
                        setHintMove(bestMove);
                        
                        if (suggestions.length > 0) {
                            suggestions.sort((a, b) => b.score - a.score);
                            const best = suggestions[0].score;
                            const worst = suggestions[suggestions.length - 1].score;
                            const range = best - worst || 1;
                            
                            const labeled = suggestions.slice(0, 3).map((s, i) => {
                                const pct = Math.round(((s.score - worst) / range) * 100);
                                let label, color;
                                if (pct >= 80) { label = '✅ Tuyệt vời!'; color = '#4ade80'; }
                                else if (pct >= 50) { label = '✓ Tốt'; color = '#60b5fa'; }
                                else if (pct >= 20) { label = '⚠️ Bình thường'; color = '#fbbf24'; }
                                else { label = '❌ Yếu'; color = '#ef4444'; }
                                
                                return { 
                                    ...s, label, color, percentage: pct,
                                    evalDisplay: (s.score > 0 ? '+' : '') + (s.score / 100).toFixed(1)
                                };
                            });
                            setHintSuggestions(labeled);
                        }
                    }
                    setIsThinkingHint(false);
                    onClick?.();
                    engine.current.removeEventListener('message', handler);
                }
            };
            
            engine.current.addEventListener('message', handler);
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth 15`);
        }
    }, [game, isEngineReady, gameOver, myColor, onClick]);

    const undoMove = useCallback(() => {
        if (mode !== 'solo' || gameOver) return;

        setGame((g) => {
            const newGame = new Chess();
            newGame.loadPgn(g.pgn());
            if (newGame.history().length === 0) return g;
            if (newGame.turn() === myColor) {
                newGame.undo();
                newGame.undo();
            } else {
                newGame.undo();
            }
            return newGame;
        });

        setSelectedSquare(null);
        setValidMoves([]);
        setHintMove(null);
        setHintSuggestions(null);
        onClick?.();
    }, [mode, gameOver, myColor, onClick]);

    const resetGame = useCallback(() => {
        setGame(new Chess());
        setSelectedSquare(null);
        setValidMoves([]);
        setHintMove(null);
        setHintSuggestions(null);
        setGameOver(false);
        setWinner(null);
    }, []);

    return {
        game,
        turn: game.turn(), // 'w' or 'b'
        isGameOver: gameOver,
        winner,
        selectedSquare,
        validMoves,
        moveHistory,
        evalScore,
        hintMove,
        hintSuggestions,
        isThinkingHint,
        selectSquare,
        movePiece,
        makeAIMove,
        undoMove,
        getHint,
        resetGame,
        setHintMove,
        setHintSuggestions
    };
}
