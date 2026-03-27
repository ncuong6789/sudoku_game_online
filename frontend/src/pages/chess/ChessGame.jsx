import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useAudio } from '../../utils/useAudio';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, Flag } from 'lucide-react';

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

    useEffect(() => {
        if (mode === 'solo') {
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
                    if (moveMatch) {
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
        }
    }, [mode, difficulty]);

    const makeAIMove = useCallback(() => {
        if (engine.current && isEngineReady) {
            const depth = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 8 : 15;
            engine.current.postMessage(`position fen ${game.fen()}`);
            engine.current.postMessage(`go depth ${depth}`);
        }
    }, [game, isEngineReady, difficulty]);

    useEffect(() => {
        if (mode === 'solo' && !gameOver && game.turn() !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [game, mode, gameOver, myColor, makeAIMove]);

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
            // Hoán đổi màu lính nếu muốn luân phiên (tùy chọn), tạm thời giữ nguyên màu
        }
    };

    const handleSurrender = () => {
        setGameOver(true);
        setStatusMessage('Bạn đã đầu hàng!');
        playLoseSound();
        // Có thể emit sư kiện cho socket nếu đang chơi online
    };

    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares };
        if (moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];
            styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
            styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
        }
        return styles;
    }, [optionSquares, moveHistory]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: 'calc(100vh - 80px)', padding: '0.5rem' }}>
            <div className="glass-panel" style={{ 
                position: 'relative',
                overflow: 'hidden',
                width: 'fit-content', 
                height: 'fit-content', 
                display: 'flex', 
                flexDirection: 'row', 
                padding: '1rem', 
                gap: '1.5rem', 
                alignItems: 'stretch',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                
                {/* TRÁI: BÀN CỜ TỐI ƯU KÍCH THƯỚC */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, position: 'relative' }}>
                    <div style={{
                        position: 'relative', 
                        width: 'min(calc(100vh - 120px), 650px)', 
                        height: 'min(calc(100vh - 120px), 650px)',
                        border: '6px solid rgba(20, 20, 30, 0.9)', 
                        borderRadius: '12px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)', 
                        overflow: 'hidden',
                        background: '#d1dee6', 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(8, 1fr)', 
                        gridTemplateRows: 'repeat(8, 1fr)'
                    }}>
                        {(() => {
                            const ranksArr = [8,7,6,5,4,3,2,1];
                            const filesArr = ['a','b','c','d','e','f','g','h'];
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
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const sourceSq = e.dataTransfer.getData('text/plain');
                                                if(sourceSq && sourceSq !== sq) attemptPlayerMove(sourceSq, sq);
                                            }}
                                            style={{
                                                backgroundColor: finalBg, position: 'relative', display: 'flex',
                                                justifyContent: 'center', alignItems: 'center', 
                                                cursor: game.turn() === myColor ? 'pointer' : 'default',
                                                ...(game.isCheck() && piece && piece.type === 'k' && piece.color === game.turn() ? {animation: 'blink-red 1s infinite'} : {})
                                            }}
                                        >
                                            {dotOverlay && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: dotOverlay, borderRadius: '50%', transform: 'scale(0.3)', opacity: 0.6 }}/>}
                                            {piece && (
                                                <span 
                                                    draggable={piece.color === myColor && game.turn() === myColor}
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', sq);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        onSquareClick(sq);
                                                    }}
                                                    style={{
                                                        fontSize: 'min(7.5vh, 7.5vw)', lineHeight: 1, color: piece.color === 'w' ? '#fff' : '#1e1e1e',
                                                        textShadow: piece.color === 'w' ? '0px 2px 4px rgba(0,0,0,0.8)' : '0px 2px 4px rgba(255,255,255,0.4)',
                                                        position: 'relative', zIndex: 2, cursor: piece.color === myColor ? 'grab' : 'default'
                                                    }}
                                                >{beautifulUnicode[piece.color][piece.type]}</span>
                                            )}
                                            {i === 7 && <span style={{position:'absolute', bottom: '2px', right: '4px', fontSize:'0.75rem', color: isLight?'#5f8099':'#d1dee6', fontWeight: 'bold'}}>{f}</span>}
                                            {j === 0 && <span style={{position:'absolute', top: '2px', left: '4px', fontSize:'0.75rem', color: isLight?'#5f8099':'#d1dee6', fontWeight: 'bold'}}>{r}</span>}
                                        </div>
                                    );
                                }
                            }
                            return squares;
                        })()}
                    </div>
                </div>

                {/* PHẢI: BẢNG ĐIỀU KHIỂN ĐỒNG BỘ */}
                <div style={{ flex: '1 1 280px', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'min(calc(100vh - 120px), 650px)' }}>
                    
                    {/* Header Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="nav-item active" style={{ padding: '10px', display: 'flex', alignSelf: 'center', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <span style={{fontSize: '1.3rem'}}>👑</span> Cờ Vua Pro
                        </div>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {mode === 'solo' ? `Thách đấu AI (${difficulty})` : `Phòng: ${roomId}`}
                        </div>

                        {/* Badge người chơi */}
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(74, 222, 128, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>{myColor === 'w' ? 'Trắng' : 'Đen'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Bạn</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>vs</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171', lineHeight: 1 }}>{myColor === 'w' ? 'Đen' : 'Trắng'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'center' }}>{mode === 'solo' ? 'Thần đồng AI' : 'Đối thủ'}</span>
                            </div>
                        </div>

                        {!gameOver && (
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: game.turn() === myColor ? 'var(--primary-color)' : '#ff4757', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: game.turn() === myColor ? '#4ade80' : '#f87171' }}>
                                    {game.turn() === myColor ? '👉 Lượt của bạn!' : '⏳ Đối thủ đang nghĩ...'}
                                </div>
                                {game.isCheck() && (
                                    <div style={{ fontSize: '0.85rem', color: '#f87171', marginTop: '6px', animation: 'pulse 1s infinite' }}>
                                        ⚠️ Đang bị CHIẾU!
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            <button className="btn-primary" onClick={handleReset} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <RotateCcw size={18} /> Chơi ván mới
                            </button>
                            {!gameOver && (
                                <button className="btn-secondary" onClick={handleSurrender} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', borderColor: 'rgba(248, 113, 113, 0.5)', color: '#f87171' }}>
                                    <Flag size={18} /> Đầu hàng
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <ArrowLeft size={18} /> Thoát
                            </button>
                        </div>
                    </div>

                    {/* Diễn biến Lịch sử nước đi */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <span>📊</span> Lịch sử nước đi
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', padding: '0 4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trắng</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đen</span>
                        </div>
                        <div style={{
                            flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {moveHistory.length === 0 && (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    Bắt đầu ván mới...
                                </div>
                            )}
                            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                                <div key={i} style={{ display: 'flex', fontSize: '0.9rem', padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                                    <span style={{ width: '25px', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', fontSize: '0.75rem' }}>{i + 1}.</span>
                                    <span style={{ flex: 1, color: '#f8f9fa' }}>{moveHistory[i * 2]?.san}</span>
                                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.5)' }}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                                </div>
                            ))}
                            <div ref={el => el && el.scrollIntoView({ behavior: 'smooth' })} />
                        </div>
                    </div>
                </div>

                {/* GAME OVER FULL PANEL OVERLAY */}
                {gameOver && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '25px'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>
                            {statusMessage.includes('Thắng') ? '🏆' : statusMessage.includes('Hòa') ? '🤝' : '💀'}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '3rem', textAlign: 'center', color: statusMessage.includes('Thắng') ? '#4ade80' : '#f87171', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            {statusMessage}
                        </h2>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={handleReset}>
                                <RotateCcw size={24} /> Chơi lại
                            </button>
                            <button className="btn-secondary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')}>
                                <ArrowLeft size={24} /> Thoát
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
