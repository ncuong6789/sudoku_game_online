import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, Swords, Crown } from 'lucide-react';

// Unicode Chess Pieces
const PIECE_SYMBOLS = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
};

export default function ChessGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    // Standardized player color 'w' or 'b'
    const myColor = playerColor === 'w' ? 'w' : 'b';

    const [game] = useState(new Chess());
    const [board, setBoard] = useState(game.board());
    const [moveHistory, setMoveHistory] = useState([]); // for triggering re-renders safely
    
    // UI State
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]); // array of 'to' squares

    const [gameOver, setGameOver] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Ván đấu bắt đầu!');

    // Cập nhật trạng thái
    const updateGameState = useCallback(() => {
        setBoard([...game.board()]);
        
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
        setMoveHistory([...game.history()]);
    }, [game, myColor, mode]);

    // Lắng nghe Socket cho Multiplayer
    useEffect(() => {
        if (mode === 'multiplayer' && roomId) {
            const handleOpponentMove = ({ fen }) => {
                try {
                    game.load(fen);
                    updateGameState();
                } catch (e) {
                    console.error('Invalid fen received', e);
                }
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
            game.move(move);
            updateGameState();
        } catch (e) { console.error('AI move error', e); }
    };

    const handleSquareClick = (square) => {
        if (gameOver || game.turn() !== myColor) return;

        // Nếu click vào ô có quân của mình (khi đã hoặc chưa chọn quân)
        const targetPiece = game.get(square);
        
        // Hỗ trợ Nhập thành: Click Vua đang chọn -> Click Xe cùng màu
        let effectiveSquare = square;
        if (selectedSquare) {
            const selectedPiece = game.get(selectedSquare);
            if (selectedPiece && selectedPiece.type === 'k' && selectedPiece.color === myColor &&
                targetPiece && targetPiece.type === 'r' && targetPiece.color === myColor) {
                // Ánh xạ ô Xe (h1/a1/h8/a8) thành ô đích chuẩn của nhập thành (g1/c1/g8/c8)
                if (myColor === 'w') {
                    if (square === 'h1') effectiveSquare = 'g1';
                    if (square === 'a1') effectiveSquare = 'c1';
                } else {
                    if (square === 'h8') effectiveSquare = 'g8';
                    if (square === 'a8') effectiveSquare = 'c8';
                }
            }
        }

        if (targetPiece && targetPiece.color === myColor && effectiveSquare === square) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            
            // Highlight các ô target.
            // Nếu Vua có thể nhập thành, moves.to sẽ là 'g1'/'c1'. Để giúp người dùng dễ hiểu, 
            // có thể tô sáng cả vị trí đó (mặc định đã làm).
            setPossibleMoves(moves.map(m => m.to));
            return;
        }

        // Nếu đã chọn quân và click vào ô hợp lệ (hoặc ô effectiveSquare do nhập thành) -> Đi quân
        if (selectedSquare && possibleMoves.includes(effectiveSquare)) {
            try {
                game.move({
                    from: selectedSquare,
                    to: effectiveSquare,
                    promotion: 'q' // Luôn tự động phong cấp thành Hậu cho đơn giản
                });
                
                setSelectedSquare(null);
                setPossibleMoves([]);
                updateGameState();

                if (mode === 'multiplayer') {
                    socket.emit('chessMove', { roomId, fen: game.fen() });
                }
            } catch (e) {
                console.error("Move error:", e);
                setSelectedSquare(null);
                setPossibleMoves([]);
            }
        } else {
            // Click ra ngoài hoặc ô không hợp lệ -> Bỏ chọn
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    };

    const handleReset = () => {
        if (mode === 'solo') {
            game.reset();
            updateGameState();
            setGameOver(false);
            setSelectedSquare(null);
            setPossibleMoves([]);
            if (myColor === 'b') {
                setTimeout(makeAIMove, 600); // Nếu chơi quân Đen, AI (Trắng) đi trước
            }
        }
    };

    // Chuẩn bị bàn cờ để render (xoay bàn nếu chơi quân Đen)
    const renderBoard = useMemo(() => {
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        // Nếu chơi quân đen, lật ngược bàn cờ để quân đen nằm dưới
        const renderRanks = myColor === 'b' ? [...ranks].reverse() : ranks;
        const renderFiles = myColor === 'b' ? [...files].reverse() : files;

        return renderRanks.map((r, rowIndex) => (
            renderFiles.map((f, colIndex) => {
                const square = `${f}${r}`;
                const piece = game.get(square);
                
                // Kẻ caro xen kẽ
                const isLightSquare = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selectedSquare === square;
                const isPossibleMove = possibleMoves.includes(square);
                const isLastMove = false; // Có thể làm tính năng highlight nước đi cuối sau

                let bgColor = isLightSquare ? 'rgba(255,255,255, 0.15)' : 'rgba(0,0,0, 0.3)';
                if (isSelected) bgColor = 'rgba(79, 172, 254, 0.5)';
                else if (isPossibleMove && piece) bgColor = 'rgba(239, 68, 68, 0.4)'; // Ô có thể ăn quân địch

                return (
                    <div 
                        key={square}
                        onClick={() => handleSquareClick(square)}
                        style={{
                            background: bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: game.turn() === myColor && (!piece || piece.color === myColor || possibleMoves.includes(square)) ? 'pointer' : 'default',
                            transition: 'background 0.2s',
                        }}
                    >
                        {/* Dấu chấm báo hiệu nước đi hợp lệ */}
                        {isPossibleMove && !piece && (
                            <div style={{
                                position: 'absolute',
                                width: '25%', height: '25%',
                                background: 'rgba(79, 172, 254, 0.6)',
                                borderRadius: '50%'
                            }} />
                        )}

                        {/* Quân cờ */}
                        {piece && (
                            <span style={{
                                fontSize: '2.5rem',
                                lineHeight: 1,
                                cursor: 'pointer',
                                filter: piece.color === 'w' 
                                    ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' 
                                    : 'drop-shadow(0px 1px 1px rgba(255,255,255,0.3))',
                                color: piece.color === 'w' ? '#f8f9fa' : '#212529',
                                // Dùng text-shadow để tạo viền
                                textShadow: piece.color === 'w' 
                                    ? '0 0 1px #000, 0 0 2px #000' 
                                    : '0 0 1px #fff, 0 0 2px #fff'
                            }}>
                                {PIECE_SYMBOLS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                            </span>
                        )}
                        
                        {/* Tọa độ (chỉ hiện ngoài mép) */}
                        {colIndex === 0 && (
                            <span style={{ position: 'absolute', top: '2px', left: '2px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                                {r}
                            </span>
                        )}
                        {rowIndex === 7 && (
                            <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                                {f}
                            </span>
                        )}
                    </div>
                );
            })
        ));
    }, [game, myColor, selectedSquare, possibleMoves, moveHistory]);

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
                            <button className="btn-secondary" onClick={handleReset} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <RotateCcw size={16} /> Chơi lại
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/chess/multiplayer' : '/chess')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
                    
                    {/* Bàn cờ */}
                    <div style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(8, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(8, minmax(0, 1fr))`,
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '4px solid rgba(20, 20, 30, 0.8)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            width: '100%',
                            maxHeight: '70vh',
                            maxWidth: '70vh',
                            aspectRatio: '1 / 1',
                            overflow: 'hidden'
                        }}>
                            {renderBoard}
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
                                            <span style={{ flex: 1, color: '#f8f9fa' }}>{moveHistory[i * 2]}</span>
                                            <span style={{ flex: 1, color: '#aaa' }}>{moveHistory[i * 2 + 1] || ''}</span>
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
