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
    const [realPlayerColor, setRealPlayerColor] = useState(() => {
        if (playerColor === 'random') {
            return Math.random() < 0.5 ? 'w' : 'b';
        }
        return playerColor;
    });
    const [moveHistory, setMoveHistory] = useState([]); 

    const myColor = realPlayerColor || 'w';
    
    // UI State
    const [moveFrom, setMoveFrom] = useState(null);
    const [optionSquares, setOptionSquares] = useState({});

    const [gameOver, setGameOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Ván đấu bắt đầu!');

    // 1. Cập nhật Status, History mỗi khi `game` thay đổi.
    useEffect(() => {
        setMoveHistory(game.history({ verbose: true }));
        
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
                : `Đến lượt ${mode === 'solo' ? 'AI' : 'đối thủ'}.`;
            if (game.isCheck()) {
                status = `Đang bị chiếu! - ` + status;
            }
        }
        setStatusMessage(status);
        
    }, [game, myColor, mode]);

    // Lắng nghe Socket cho Multiplayer
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ fen: newFen }) => {
                setGame((g) => {
                    const newGame = new Chess();
                    // Load FEN từ đối thủ
                    try { newGame.load(newFen); } catch (e) { return g; }
                    return newGame;
                });
            };
            socket.on('chessMoved', handleOpponentMove);
            return () => socket.off('chessMoved', handleOpponentMove);
        }
    }, [mode, roomId]);

    // AI Logic cho Solo
    const makeAIMove = useCallback(() => {
        setGame((g) => {
            const moves = g.moves({ verbose: true });
            if (moves.length === 0) return g;

            let move = null;
            if (difficulty === 'Easy') {
                move = moves[Math.floor(Math.random() * moves.length)];
            } else {
                const captures = moves.filter(m => m.flags.includes('c'));
                if (captures.length > 0) {
                    move = captures[Math.floor(Math.random() * captures.length)];
                } else {
                    move = moves[Math.floor(Math.random() * moves.length)];
                }
            }
            
            try {
                const gameCopy = new Chess();
                gameCopy.loadPgn(g.pgn());
                gameCopy.move(move);
                return gameCopy;
            } catch (e) { return g; }
        });
    }, [difficulty]);

    useEffect(() => {
        if (mode === 'solo' && !gameOver && game.turn() !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [game, mode, gameOver, myColor, makeAIMove]);

    // Hàm an toàn để thực thi nước đi của người chơi
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
            
            // Cập nhật State tức thì (Synchronous Object Reference Update)
            setGame(gameCopy);

            setMoveFrom(null);
            setOptionSquares({});
            if (mode === 'multiplayer') {
                socket.emit('chessMove', { roomId, fen: gameCopy.fen() });
            }
            return true;
        } catch (e) {
            console.error('Lỗi di chuyển: ', e);
            return false;
        }
    }

    function onDrop(sourceSquare, targetSquare, piece) {
        if (gameOver || game.turn() !== myColor) return false;
        return attemptPlayerMove(sourceSquare, targetSquare);
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
                                key={myColor}
                                position={game.fen()}
                                onPieceDrop={onDrop}
                                onSquareClick={onSquareClick}
                                isDraggablePiece={({ piece }) => piece[0] === myColor}
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
