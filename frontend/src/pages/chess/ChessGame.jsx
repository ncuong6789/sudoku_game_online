import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, Swords, Crown } from 'lucide-react';
import { Chessboard } from 'react-chessboard';

export default function ChessGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState(game.fen());
    const [realPlayerColor, setRealPlayerColor] = useState(null);
    const [moveHistory, setMoveHistory] = useState([]); 
    
    // Khởi tạo màu quân thực tế
    useEffect(() => {
        if (playerColor === 'random') {
            const randomColor = Math.random() < 0.5 ? 'w' : 'b';
            setRealPlayerColor(randomColor);
            console.log('Random color selected:', randomColor);
        } else {
            setRealPlayerColor(playerColor);
        }
    }, [playerColor]);

    const myColor = realPlayerColor || 'w';
    
    // UI State
    const [moveFrom, setMoveFrom] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});

    const [gameOver, setGameOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Ván đấu bắt đầu!');

    // Cập nhật trạng thái
    const updateGameState = useCallback((gameInstance) => {
        if (!gameInstance) return;
        
        let status = '';
        if (gameInstance.isCheckmate()) {
            status = `Chiếu Bí! ${gameInstance.turn() === 'w' ? 'Đen' : 'Trắng'} thắng.`;
            setGameOver(true);
        } else if (gameInstance.isDraw()) {
            status = 'Hòa cờ!';
            setGameOver(true);
        } else {
            status = gameInstance.turn() === myColor 
                ? 'Đến lượt bạn.' 
                : `Đến lượt ${mode === 'solo' ? 'AI' : 'đối thủ'}.`;
            if (gameInstance.isCheck()) {
                status = `Đang bị chiếu! - ` + status;
            }
        }
        setStatusMessage(status);
        setMoveHistory([...gameInstance.history({ verbose: true })]);
        setGame(gameInstance);
        setFen(gameInstance.fen());
    }, [myColor, mode]);

    // Lắng nghe Socket cho Multiplayer
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ fen }) => {
                const newGame = new Chess(fen);
                updateGameState(newGame);
            };
            socket.on('chessMoved', handleOpponentMove);
            return () => socket.off('chessMoved', handleOpponentMove);
        }
    }, [mode, roomId, game, updateGameState]);

    // AI Logic cho Solo
    useEffect(() => {
        if (mode === 'solo' && !gameOver && game.turn() !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600); // AI suy nghĩ 600ms
            return () => clearTimeout(timer);
        }
    }, [moveHistory, mode, gameOver, myColor]);

    const makeAIMove = () => {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return;

        let move = null;
        if (difficulty === 'Easy') {
            move = moves[Math.floor(Math.random() * moves.length)];
        } else {
            // Medium/Hard: Ưu tiên ăn quân
            const captures = moves.filter(m => m.flags.includes('c'));
            if (captures.length > 0) {
                move = captures[Math.floor(Math.random() * captures.length)];
            } else {
                move = moves[Math.floor(Math.random() * moves.length)];
            }
        }
        
        try {
            const gameCopy = new Chess(game.fen());
            gameCopy.move(move);
            updateGameState(gameCopy);
        } catch (e) { console.error('AI move error', e); }
    };

    function onDrop(sourceSquare, targetSquare, piece) {
        if (gameOver || game.turn() !== myColor) return false;

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: piece[1]?.toLowerCase() ?? 'q',
            });

            if (move === null) return false;

            updateGameState(gameCopy);
            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, fen: gameCopy.fen() });
            }
            setMoveFrom(null);
            setOptionSquares({});
            return true;
        } catch (e) {
            return false;
        }
    }

    function onSquareClick(square) {
        if (gameOver || game.turn() !== myColor) return;

        function resetFirstMove(sq) {
            const hasPiece = game.get(sq);
            if (hasPiece && hasPiece.color === myColor) {
                setMoveFrom(sq);
                return getMoveOptions(sq);
            }
            setMoveFrom(null);
            setOptionSquares({});
            return false;
        }

        function getMoveOptions(sq) {
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
            newSquares[sq] = { background: 'rgba(79, 172, 254, 0.5)' }; // highlighted selected
            setOptionSquares(newSquares);
            return true;
        }

        if (!moveFrom) {
            return resetFirstMove(square);
        }

        // Đã có từ moveFrom, thử đi quân
        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: moveFrom,
                to: square,
                promotion: 'q'
            });

            if (move === null) return resetFirstMove(square);

            updateGameState(gameCopy);
            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, fen: gameCopy.fen() });
            }
            setMoveFrom(null);
            setOptionSquares({});
            return true;
        } catch (e) {
            return resetFirstMove(square);
        }
    }

    const handleReset = () => {
        if (mode === 'solo') {
            const newGame = new Chess();
            updateGameState(newGame);
            setGameOver(false);
            setMoveFrom(null);
            setOptionSquares({});
            if (myColor === 'b') {
                setTimeout(() => {
                    const moves = newGame.moves({ verbose: true });
                    if (moves.length > 0) {
                        const move = moves[Math.floor(Math.random() * moves.length)];
                        newGame.move(move);
                        updateGameState(newGame);
                    }
                }, 600); 
            }
        }
    };

    const customSquareStyles = useMemo(() => {
        const styles = { ...optionSquares };
        if (moveHistory.length > 0) {
            const lastMove = moveHistory[moveHistory.length - 1];
            // Highlight background cho From và To của nước cờ vừa rồi
            styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
            styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: 'rgba(255, 235, 59, 0.4)' };
        }
        return styles;
    }, [optionSquares, moveHistory]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="nav-item active" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Crown size={18} /> Cờ vua
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {mode === 'solo' ? `Thách đấu AI (${difficulty})` : `Phòng: ${roomId}`}
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {mode === 'solo' && (
                            <button className="btn-secondary" onClick={handleReset} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                <RotateCcw size={16} /> Chơi lại
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
                    
                    {/* Bàn cờ bằng react-chessboard */}
                    <div style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <div style={{ 
                            width: '100%',
                            maxWidth: '70vh',
                            maxHeight: '70vh',
                            aspectRatio: '1 / 1',
                            border: '4px solid rgba(20, 20, 30, 0.8)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.1)',
                        }}>
                            <Chessboard 
                                position={fen} 
                                onPieceDrop={onDrop}
                                onSquareClick={onSquareClick}
                                boardOrientation={myColor === 'w' ? 'white' : 'black'}
                                customSquareStyles={customSquareStyles}
                                animationDuration={200}
                                customDropSquareStyle={{ boxShadow: 'inset 0 0 1px 4px rgba(79, 172, 254, 0.8)' }}
                                customDarkSquareStyle={{ backgroundColor: '#5f8099' }}
                                customLightSquareStyle={{ backgroundColor: '#d1dee6' }}
                            />
                        </div>
                    </div>

                    {/* Bảng trạng thái bên phải */}
                    <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 1rem 0' }}>Trạng thái</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    background: game.turn() === 'w' ? '#f8f9fa' : '#212529',
                                    border: '2px solid rgba(255,255,255,0.5)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    flexShrink: 0
                                }}></div>
                                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: gameOver ? 'var(--error-color)' : game.turn() === myColor ? 'var(--primary-color)' : 'white' }}>
                                    {statusMessage}
                                </span>
                            </div>

                            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Phe của bạn:</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                        width: '28px', height: '28px', borderRadius: '4px', 
                                        background: myColor === 'w' ? '#f8f9fa' : '#212529',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: myColor === 'w' ? '#000' : '#fff'
                                    }}>
                                        {myColor === 'w' ? '♔' : '♚'}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{myColor === 'w' ? 'Trắng (Đi trước)' : 'Đen'}</span>
                                </div>
                            </div>
                            
                            {/* Lịch sử di chuyển */}
                            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Lịch sử giao tranh</h4>
                                <div style={{ 
                                    flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', 
                                    borderRadius: '8px', padding: '0.5rem', maxHeight: '150px'
                                }}>
                                    {moveHistory.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '40px 0' }}>Chưa có nước đi nào</p>}
                                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                                        <div key={i} style={{ display: 'flex', fontSize: '0.85rem', padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ width: '30px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{i + 1}.</span>
                                            <span style={{ flex: 1, color: '#f8f9fa' }}>{moveHistory[i * 2]?.san}</span>
                                            <span style={{ flex: 1, color: '#aaa' }}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                                        </div>
                                    ))}
                                    <div ref={el => el && el.scrollIntoView({ behavior: 'smooth' })} />
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}
