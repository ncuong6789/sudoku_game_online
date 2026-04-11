import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useAudio } from '../../utils/useAudio';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, Flag, Undo2, HelpCircle } from 'lucide-react';

export default function ChessGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const [game, setGame] = useState(new Chess());
    const [realPlayerColor, setRealPlayerColor] = useState(() => {
        if (playerColor === 'random') {
            return Math.random() < 0.5 ? 'w' : 'b';
        }
        return playerColor;
    });
    const [moveHistory, setMoveHistory] = useState([]);

    const myColor = realPlayerColor || 'w';

    // UI State
    const [gameOver, setGameOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [moveFrom, setMoveFrom] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});

    const { playChessMoveSound, playChessCaptureSound, playChessCheckSound, playWinSound, playLoseSound } = useAudio();

    // 1. Cập nhật Status, History mỗi khi `game` thay đổi.
    useEffect(() => {
        const history = game.history({ verbose: true });
        setMoveHistory(history);

        if (history.length > 0) {
            const lastMove = history[history.length - 1];
            if (game.isCheckmate()) {
                if (game.turn() === myColor) playLoseSound(); // Mình thua
                else playWinSound(); // Mình thắng
            } else if (game.isDraw()) {
                playChessMoveSound();
            } else if (game.isCheck()) {
                playChessCheckSound();
            } else if (lastMove.flags.includes('c')) {
                playChessCaptureSound();
            } else {
                playChessMoveSound();
            }
        }

        let status = '';
        if (game.isCheckmate()) {
            status = `Chiếu Bí! ${game.turn() === 'w' ? 'Đen' : 'Trắng'} thắng.`;
            setGameOver(true);
        } else if (game.isDraw()) {
            status = 'Hòa cờ!';
            setGameOver(true);
        } else {
            status = game.turn() === myColor
                ? 'Đến lượt bạn.'
                : `Đến lượt đối thủ.`;
        }
        setStatusMessage(status);

    }, [game, myColor, playChessMoveSound, playChessCaptureSound, playChessCheckSound, playWinSound, playLoseSound]);

    // Lắng nghe Socket cho Multiplayer
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ move, fen: newFen }) => {
                setGame((g) => {
                    const newGame = new Chess();
                    newGame.loadPgn(g.pgn());

                    if (move) {
                        try {
                            newGame.move(move);
                            return newGame;
                        } catch (e) {
                            console.error("Lỗi đồng bộ move, dùng FEN fallback");
                        }
                    }

                    try { newGame.load(newFen); } catch (e) { return g; }
                    return newGame;
                });
            };
            const handleOpponentDisconnect = () => {
                if (!gameOver) {
                    setGameOver(true);
                    setStatusMessage(`Bạn đã thắng! Đối thủ thoái thác.`);
                }
            };
            socket.on('chessMoved', handleOpponentMove);
            socket.on('opponentDisconnected', handleOpponentDisconnect);
            return () => {
                socket.off('chessMoved', handleOpponentMove);
                socket.off('opponentDisconnected', handleOpponentDisconnect);
            };
        }
    }, [mode, roomId, gameOver, myColor]);

    useEffect(() => {
        return () => {
            if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    // --- STOCKFISH ENGINE INTEGRATION ---
    const engine = useRef(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [hintMove, setHintMove] = useState(null);
    const [isThinkingHint, setIsThinkingHint] = useState(false);

    useEffect(() => {
        // Khởi tạo Engine cho cả Solo và Multiplayer (để dùng Hint)
        const stockfishWorker = new Worker(
            URL.createObjectURL(
                new Blob([`importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`], { type: 'application/javascript' })
            )
        );

        stockfishWorker.onmessage = (e) => {
            const line = e.data;
            if (line === 'readyok') {
                setIsEngineReady(true);
            } else if (line.startsWith('bestmove')) {
                const moveMatch = line.match(/bestmove\s([a-h][1-8][a-h][1-8])(n|b|r|q)?/);
                if (moveMatch && mode === 'solo' && !isThinkingHint) {
                    const moveStr = moveMatch[1];
                    const promotion = moveMatch[2];
                    const from = moveStr.substring(0, 2);
                    const to = moveStr.substring(2, 4);

                    setGame((g) => {
                        const newGame = new Chess();
                        newGame.loadPgn(g.pgn());
                        try {
                            newGame.move({ from, to, promotion: promotion || 'q' });
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
    }, [difficulty]);

    const makeAIMove = useCallback(() => {
        if (engine.current && isEngineReady && !game.isGameOver()) {
            const depth = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 8 : 15;
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth ${depth}`);
        }
    }, [game, isEngineReady, difficulty]);

    const getAIHint = useCallback(() => {
        if (engine.current && isEngineReady && !game.isGameOver() && game.turn() === myColor) {
            setIsThinkingHint(true);
            setHintMove(null);
            
            const onHintMessage = (e) => {
                const line = e.data;
                if (line.startsWith('bestmove')) {
                    const moveMatch = line.match(/bestmove\s([a-h][1-8][a-h][1-8])(n|b|r|q)?/);
                    if (moveMatch) {
                        const moveStr = moveMatch[1];
                        setHintMove({ from: moveStr.substring(0, 2), to: moveStr.substring(2, 4) });
                    }
                    setIsThinkingHint(false);
                    engine.current.removeEventListener('message', onHintMessage);
                }
            };
            
            engine.current.addEventListener('message', onHintMessage);
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth 12`);
        }
    }, [game, isEngineReady, myColor]);

    useEffect(() => {
        if (mode === 'solo' && !gameOver && isEngineReady && game.turn() !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [game, mode, gameOver, myColor, makeAIMove, isEngineReady]);

    function attemptPlayerMove(sourceSquare, targetSquare) {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        const legalMoves = gameCopy.moves({ square: sourceSquare, verbose: true });
        const foundMove = legalMoves.find(m => m.to === targetSquare);

        if (!foundMove) return false;
        const moveObj = { from: sourceSquare, to: targetSquare };
        if (foundMove.promotion) moveObj.promotion = 'q';

        try {
            gameCopy.move(moveObj);
            setGame(gameCopy);
            setMoveFrom(null);
            setOptionSquares({});
            setHintMove(null); // Clear hint after move
            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, move: moveObj, fen: gameCopy.fen() });
            }
            return true;
        } catch (e) {
            console.error('Lỗi di chuyển: ', e);
            return false;
        }
    }

    function onSquareClick(square) {
        if (gameOver || game.turn() !== myColor) return;

        function resetFirstMove(sq) {
            const hasPiece = game.get(sq);
            if (hasPiece && hasPiece.color === myColor) {
                setMoveFrom(sq);
                const moves = game.moves({ square: sq, verbose: true });
                if (moves.length === 0) {
                    setOptionSquares({});
                    return false;
                }
                const newSquares = {};
                moves.map((move) => {
                    newSquares[move.to] = {
                        background: game.get(move.to) && game.get(move.to).color !== game.get(sq).color
                            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 85%, transparent 85%)'
                            : 'radial-gradient(circle, rgba(79, 172, 254, 0.6) 25%, transparent 25%)',
                        borderRadius: '50%'
                    };
                });
                newSquares[sq] = { background: 'rgba(79, 172, 254, 0.5)' };
                setOptionSquares(newSquares);
                return true;
            }
            setMoveFrom(null);
            setOptionSquares({});
            return false;
        }

        if (!moveFrom) {
            return resetFirstMove(square);
        }
        const isSuccess = attemptPlayerMove(moveFrom, square);
        if (!isSuccess) {
            return resetFirstMove(square);
        }
        return true;
    }

    const handleReset = () => {
        if (mode === 'solo') {
            setGame(new Chess());
            setGameOver(false);
            setMoveFrom(null);
            setOptionSquares({});
            setHintMove(null);
        }
    };

    const handleUndo = () => {
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

        setMoveFrom(null);
        setOptionSquares({});
        setHintMove(null);
    };

    const handleSurrender = () => {
        setGameOver(true);
        setStatusMessage('Bạn đã đầu hàng!');
        playLoseSound();
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameOver && mode === 'solo' && (e.key === ' ' || e.code === 'Space')) {
                e.preventDefault();
                handleReset();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, mode]);

    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares };
        if (moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];
            styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
            styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
        }
        if (hintMove) {
            styles[hintMove.from] = { ...styles[hintMove.from], border: '4px solid #fbbf24' };
            styles[hintMove.to] = { 
                ...styles[hintMove.to], 
                border: '4px solid #fbbf24', 
                background: 'rgba(251, 191, 36, 0.2)' 
            };
        }
        return styles;
    }, [optionSquares, moveHistory, hintMove]);

    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', padding: '0.5rem', boxSizing: 'border-box' }}>
            <div className="glass-panel game-play-panel" style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1.2rem',
                gap: '1.5rem',
                alignItems: 'stretch',
                justifyContent: 'center',
                height: 'fit-content',
                maxHeight: '96vh',
                width: 'max-content',
                maxWidth: '98%',
                borderRadius: '20px',
                background: 'rgba(23, 23, 33, 0.85)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>

                {/* LEFT: MOVE HISTORY */}
                <div style={{
                    flex: '0 1 260px',
                    width: '260px',
                    minWidth: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.2rem',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: '1.2rem' }}>📊</span> Lịch sử
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', marginBottom: '0.6rem', padding: '0 4px' }}>
                        <span></span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Trắng</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Đen</span>
                    </div>
                    <div style={{
                        flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px', padding: '8px', border: '1px solid rgba(255,255,255,0.05)',
                        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent'
                    }}>
                        {moveHistory.length === 0 && (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                                Bắt đầu...
                            </div>
                        )}
                        {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                            <div key={i} style={{
                                display: 'grid',
                                gridTemplateColumns: '30px 1fr 1fr',
                                fontSize: '0.9rem',
                                padding: '8px 4px',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                alignItems: 'center'
                            }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 'bold', fontSize: '0.75rem' }}>{i + 1}.</span>
                                <span style={{ color: '#fff', fontWeight: 500 }}>{moveHistory[i * 2]?.san}</span>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MIDDLE: BOARD */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0 }}>
                    <div className="game-play-board chess-board" style={{
                        position: 'relative',
                        border: '8px solid rgba(15, 15, 25, 0.95)',
                        borderRadius: '12px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        background: '#d1dee6',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gridTemplateRows: 'repeat(8, 1fr)'
                    }}>
                        {(() => {
                            const ranksArr = [8, 7, 6, 5, 4, 3, 2, 1];
                            const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                            const isFlipped = myColor === 'b';
                            const displayRanks = isFlipped ? [...ranksArr].reverse() : ranksArr;
                            const displayFiles = isFlipped ? [...filesArr].reverse() : filesArr;
                            const beautifulUnicode = {
                                'w': { 'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔' },
                                'b': { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' }
                            };
                            const squares = [];
                            for (let i = 0; i < 8; i++) {
                                for (let j = 0; j < 8; j++) {
                                    const r = displayRanks[i];
                                    const f = displayFiles[j];
                                    const sq = f + r;
                                    const isLight = (r + filesArr.indexOf(f)) % 2 !== 0;
                                    const bgColor = isLight ? '#d1dee6' : '#5f8099';
                                    const piece = game.get(sq);
                                    const highlightStyle = customSquareStyles[sq] || {};
                                    let finalBg = highlightStyle.backgroundColor || bgColor;
                                    let dotOverlay = optionSquares[sq]?.background;
                                    if (game.isCheck() && piece && piece.type === 'k' && piece.color === game.turn()) {
                                        finalBg = 'rgba(239, 68, 68, 0.8)';
                                    }
                                    squares.push(
                                        <div key={sq} onClick={() => onSquareClick(sq)}
                                            style={{
                                                backgroundColor: finalBg, position: 'relative', display: 'flex',
                                                justifyContent: 'center', alignItems: 'center',
                                                cursor: game.turn() === myColor ? 'pointer' : 'default',
                                                border: highlightStyle.border || 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {dotOverlay && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: dotOverlay, borderRadius: '50%', transform: 'scale(0.3)', opacity: 0.6 }} />}
                                            {piece && (
                                                <span style={{
                                                    fontSize: 'min(7.5vh, 7.5vw)', lineHeight: 1, color: piece.color === 'w' ? '#fff' : '#1e1e1e',
                                                    textShadow: piece.color === 'w' ? '0px 2px 4px rgba(0,0,0,0.8)' : '0px 2px 4px rgba(255,255,255,0.4)',
                                                    position: 'relative', zIndex: 2
                                                }}>{beautifulUnicode[piece.color][piece.type]}</span>
                                            )}
                                        </div>
                                    );
                                }
                            }
                            return squares;
                        })()}
                    </div>
                </div>

                {/* RIGHT: CONTROLS */}
                <div style={{ flex: '0 1 260px', width: '260px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>CỜ VUA</div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button className="btn-primary" onClick={handleReset}><RotateCcw size={18} /> Chơi ván mới</button>
                            
                            <button className="btn-secondary" onClick={getAIHint} disabled={isThinkingHint || game.turn() !== myColor} style={{ borderColor: '#fbbf24', color: '#fbbf24' }}>
                                <HelpCircle size={18} /> {isThinkingHint ? 'Đang tính...' : 'Gợi ý nước đi (AI)'}
                            </button>

                            {mode === 'solo' && !gameOver && moveHistory.length > 0 && (
                                <button className="btn-secondary" onClick={handleUndo}><Undo2 size={18} /> Đi lại</button>
                            )}
                            
                            <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')}><ArrowLeft size={18} /> Thoát</button>
                        </div>
                    </div>
                </div>

                {/* GAME OVER PANEL */}
                {gameOver && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: '1px solid rgba(74,222,128,0.4)', boxShadow: '0 0 40px rgba(74,222,128,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <h2 style={{ fontSize: '1.8rem', color: '#4ade80', margin: 0, fontWeight: 900 }}>KẾT THÚC</h2>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={handleReset} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    CHƠI LẠI
                                </button>
                                <button onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                    THOÁT
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
