import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Swords, RotateCcw, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { getFilledCellsCount } from './caroAI';
import { useCaroLogic } from './useCaroLogic';
import { socket } from '../../utils/socket';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
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
                <div style={{ flex: '1 1 250px', maxWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', maxHeight: 'min(calc(100vh - 150px), calc(100vw - 320px))' }}>
                    <div className="gp-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
                        <div className="gp-title" style={{ display: 'flex', alignSelf: 'center', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
                            <Swords size={20} /> {t('caro.title')} {BOARD_SIZE}x{BOARD_SIZE}
                        </div>
                        <div className="gp-caption" style={{ textAlign: 'center' }}>
                            {mode === 'solo' ? `${t('caro.vsAI')} (${difficulty})` : `${t('caro.room')}: ${roomId}`}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                            <div className="gp-player-row" style={{ flex: '1 1 0%', flexDirection: 'column', padding: '10px 4px', background: 'rgba(79,172,254,0.1)', border: '1px solid rgba(79,172,254,0.3)' }}>
                                <span className="gp-score" style={{ color: realPlayerSymbol === 'X' ? 'var(--primary-color)' : '#ff4757', whiteSpace: 'nowrap' }}>{realPlayerSymbol || 'X'}</span>
                                <span className="gp-micro" style={{ marginTop: '6px', letterSpacing: '2px', textTransform: 'uppercase' }}>{t('caro.you')}</span>
                            </div>
                            <div className="gp-ui" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>VS</div>
                            <div className="gp-player-row" style={{ flex: '1 1 0%', flexDirection: 'column', padding: '10px 4px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>
                                <span className="gp-score" style={{ color: realPlayerSymbol === 'O' ? 'var(--primary-color)' : '#ff4757', whiteSpace: 'nowrap' }}>{realPlayerSymbol === 'X' ? 'O' : 'X'}</span>
                                <span className="gp-micro" style={{ marginTop: '6px', letterSpacing: '2px', textTransform: 'uppercase' }}>{mode === 'solo' ? t('caro.cpu') : t('caro.opponent')}</span>
                            </div>
                        </div>

                        {!isGameOver && (
                            <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <span className="gp-ui" style={{ color: isXNext ? 'var(--primary-color)' : '#ff4757' }}>{t('caro.turn')}: <strong>{currentTurn}</strong></span>
                                <div className="gp-caption" style={{ marginTop: '8px' }}>
                                    {(isXNext && realPlayerSymbol === 'X') || (!isXNext && realPlayerSymbol === 'O') ? t('caro.yourTurn') : (isProcessing ? t('caro.cpuThinking') : t('caro.waiting'))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            <button className="gp-btn gp-btn-primary" onClick={resetGame} style={{ padding: '12px' }}>
                                <RotateCcw size={18} /> {isGameOver ? t('common.playAgain') : t('caro.giveUp')}
                            </button>
                            <button className="gp-btn" onClick={handleExit} style={{ padding: '12px' }}>
                                <ArrowLeft size={18} /> {t('common.exit', 'Thoát')}
                            </button>
                        </div>
                    </div>

                    {mode === 'multiplayer' && (
                        <div className="gp-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
                            <div className="gp-ui" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', color: '#fff' }}>
                                <MessageSquare size={18} />
                                <span>{t('caro.chat')}</span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {messages.length === 0 && <p className="gp-caption" style={{ textAlign: 'center', fontStyle: 'italic', margin: 'auto' }}>{t('caro.sendMessage')}</p>}
                                {messages.map((msg, idx) => (
                                    <div key={idx} className="gp-body" style={{ padding: '8px 12px', background: msg.sender === socket.id ? 'rgba(var(--primary-color-rgb), 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', alignSelf: msg.sender === socket.id ? 'flex-end' : 'flex-start', maxWidth: '90%', wordWrap: 'break-word', color: '#fff' }}>
                                        {msg.message}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="text" className="glass-input gp-body" placeholder={t('caro.chatPlaceholder')} value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            sendMessage(inputMessage);
                                            setInputMessage('');
                                        }
                                    }}
                                    style={{ flex: 1, padding: '8px 10px', fontSize: 'var(--fs-body)' }} />
                                <button className="gp-btn gp-btn-primary" style={{ padding: '0 12px', width: 'auto' }} onClick={() => {
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
                        <div className="gp-card" style={{ padding: '40px 50px', background: 'rgba(30,30,40,0.95)', border: `1px solid ${winner === -1 ? 'rgba(251,191,36,0.4)' : winner === humanNum ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '3.5rem' }}>{winner === -1 ? '🤝' : winner === humanNum ? '🏆' : '💀'}</div>
                            <div className="gp-title" style={{ color: winner === -1 ? '#fbbf24' : winner === humanNum ? '#4ade80' : '#ef4444', fontWeight: 900 }}>
                                {winner === -1 ? t('caro.draw') : winner === humanNum ? t('caro.win') : t('caro.lose')}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button className="gp-btn gp-btn-primary" onClick={resetGame} style={{ background: '#4ade80', color: '#000', padding: '10px 24px', width: 'auto' }}>
                                    {t('common.playAgain', 'CHƠI LẠI').toUpperCase()}
                                </button>
                                <button className="gp-btn" onClick={handleExit} style={{ padding: '10px 24px', width: 'auto' }}>
                                    {t('common.exit', 'THOÁT').toUpperCase()}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
