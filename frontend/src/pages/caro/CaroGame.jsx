import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, MessageSquare, Send, Swords } from 'lucide-react';
import { getFilledCellsCount } from './caroAI';
import { useCaroLogic } from './useCaroLogic';
import { socket } from '../../utils/socket';

const CaroCell = React.memo(({ r, c, cell, isWinCell, onClick, isGameOver, isProcessing, boardSize, sizeRatio }) => {
    return (
        <div
            className="caro-cell"
            onClick={() => onClick(r, c)}
            style={{
                background: isWinCell ? 'rgba(var(--primary-color-rgb), 0.4)' : 'rgba(20, 20, 30, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `calc(${sizeRatio} / ${boardSize} * 0.7)`,
                fontWeight: 900,
                cursor: cell === 0 && !isGameOver && !isProcessing ? 'pointer' : 'default',
                color: cell === 1 ? 'var(--primary-color)' : '#ff4757',
                transition: 'background 0.2s',
                border: boardSize >= 20 ? '0.5px solid rgba(255,255,255,0.03)' : 'none',
                boxSizing: 'border-box',
                lineHeight: 1,
                overflow: 'hidden',
                userSelect: 'none'
            }}
        >
            {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
        </div>
    );
});

export default function CaroGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, gridSize, playerSymbol: initSymbol } = location.state || { mode: 'solo', difficulty: 'Medium', gridSize: 15 };
    const BOARD_SIZE = gridSize || 15;

    const {
        board, isXNext, winner, winningLine, isGameOver, isProcessing,
        messages, realPlayerSymbol, humanNum, soloGameCount,
        handleCellClick, resetGame, sendMessage
    } = useCaroLogic(mode, roomId, difficulty, BOARD_SIZE, initSymbol);

    const [inputMessage, setInputMessage] = useState('');
    const chatEndRef = useRef(null);

    const handleExit = () => {
        navigate(mode === 'multiplayer' ? '/caro/multiplayer' : '/caro');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isGameOver && mode === 'solo' && (e.key === ' ' || e.code === 'Space')) {
                e.preventDefault();
                resetGame();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGameOver, mode, resetGame]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const currentTurn = getFilledCellsCount(board, BOARD_SIZE) + 1;

    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: 'calc(100vh - 80px)', padding: '0.5rem' }}>
            <div className="glass-panel game-play-panel" style={{ position: 'relative', overflow: 'hidden', width: 'fit-content', height: 'fit-content', padding: '1rem', gap: '1.5rem', alignItems: 'stretch', justifyContent: 'center' }}>
                {/* TRÁI: BÀN CỜ */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, position: 'relative' }}>
                    <div className="game-play-board caro-board" style={{
                        display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                        gap: BOARD_SIZE >= 30 ? '0px' : (BOARD_SIZE > 15 ? '1px' : '2px'), background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: BOARD_SIZE >= 30 ? '0' : '2px', borderRadius: '4px', margin: 0
                    }}>
                        {board.map((row, r) => row.map((cell, c) => {
                            const isWinCell = winningLine?.some(coord => coord.r === r && coord.c === c);
                            const sizeRatio = 'min(calc(100vh - 150px), calc(100vw - 320px))';
                            return (
                                <CaroCell key={`${r}-${c}`} r={r} c={c} cell={cell} isWinCell={isWinCell} onClick={handleCellClick}
                                    isGameOver={isGameOver} isProcessing={isProcessing} boardSize={BOARD_SIZE} sizeRatio={sizeRatio} />
                            );
                        }))}
                    </div>
                </div>

                {/* PHẢI: ĐIỀU KHIỂN & CHAT */}
                <div style={{ flex: '1 1 250px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'min(calc(100vh - 150px), calc(100vw - 320px))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="nav-item active" style={{ padding: '10px', display: 'flex', alignSelf: 'center', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}><Swords size={20} /> Caro {BOARD_SIZE}x{BOARD_SIZE}</div>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{mode === 'solo' ? `Thách đấu AI (${difficulty})` : `Phòng: ${roomId}`}</div>
                        
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                            <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,172,254,0.1)', padding: '10px 4px', borderRadius: '10px', border: '1px solid rgba(79,172,254,0.3)', overflow: 'hidden' }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: realPlayerSymbol === 'X' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1, whiteSpace: 'nowrap' }}>{realPlayerSymbol || 'X'}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>BẠN</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>VS</div>
                            <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,71,87,0.1)', padding: '10px 4px', borderRadius: '10px', border: '1px solid rgba(255,71,87,0.2)', overflow: 'hidden' }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: realPlayerSymbol === 'O' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1, whiteSpace: 'nowrap' }}>{realPlayerSymbol === 'X' ? 'O' : 'X'}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>{mode === 'solo' ? 'CPU' : 'Đ.THỦ'}</span>
                            </div>
                        </div>

                        {!isGameOver && (
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: isXNext ? 'var(--primary-color)' : '#ff4757', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                Lượt thứ: <strong>{currentTurn}</strong>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '8px', color: 'var(--text-secondary)' }}>
                                    {(isXNext && realPlayerSymbol === 'X') || (!isXNext && realPlayerSymbol === 'O') ? '👉 Lượt của bạn!' : (isProcessing ? '⏳ CPU đang tính toán...' : '⏳ Đang chờ...')}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            <button className="btn-primary" onClick={resetGame} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <RotateCcw size={18} /> {isGameOver ? `Chơi ván ${soloGameCount + 2}` : 'Bỏ cuộc & Chơi ván mới'}
                            </button>
                            <button className="btn-secondary" onClick={handleExit} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <ArrowLeft size={18} /> Thoát
                            </button>
                        </div>
                    </div>

                    {mode === 'multiplayer' && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <MessageSquare size={18} />
                                <span style={{ fontWeight: 'bold' }}>Trò chuyện</span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {messages.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto' }}>Gửi lời chào nhau nhé!</p>}
                                {messages.map((msg, idx) => (
                                    <div key={idx} style={{ padding: '8px 12px', background: msg.sender === socket.id ? 'rgba(var(--primary-color-rgb), 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', alignSelf: msg.sender === socket.id ? 'flex-end' : 'flex-start', maxWidth: '90%', fontSize: '0.9rem', wordWrap: 'break-word' }}>
                                        {msg.message}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="text" className="glass-input" placeholder="Giao tiếp..." value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            sendMessage(inputMessage);
                                            setInputMessage('');
                                        }
                                    }}
                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.9rem' }} />
                                <button className="btn-primary" style={{ padding: '0 12px', borderRadius: '8px' }} onClick={() => {
                                    sendMessage(inputMessage);
                                    setInputMessage('');
                                }}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isGameOver && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${winner === -1 ? 'rgba(251,191,36,0.4)' : winner === humanNum ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, boxShadow: `0 0 40px ${winner === -1 ? 'rgba(251,191,36,0.3)' : winner === humanNum ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '3.5rem' }}>{winner === -1 ? '🤝' : winner === humanNum ? '🏆' : '💀'}</div>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: winner === -1 ? '#fbbf24' : winner === humanNum ? '#4ade80' : '#ef4444', fontWeight: 900 }}>
                                {winner === -1 ? 'HÒA' : winner === humanNum ? 'THẮNG' : 'THUA'}
                            </h2>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={resetGame} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    CHƠI LẠI
                                </button>
                                <button onClick={handleExit} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
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
