// Force Vite HMR
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, RotateCcw, Undo2, Lightbulb, History, ChevronRight, ChevronDown, Activity, Crown, ZoomIn, ZoomOut, Settings } from 'lucide-react';
import { useChessLogic } from './useChessLogic';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';
import { useTranslation } from 'react-i18next';

const PIECE_SYMBOLS = {
    w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
    b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

const MATE_SCORE = 20000;
const DRAW_SCORE = 100;

function EvalBar({ score, myColor }) {
    const normalizedScore = Math.max(-MATE_SCORE, Math.min(MATE_SCORE, score));
    const whitePct = (50 + normalizedScore / 20);
    const redPct = 100 - whitePct;

    return (
        <div style={{
            width: '24px', height: 'min(75vh, 75vw)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', flexShrink: 0, alignSelf: 'center', marginLeft: '2rem',
            transition: 'all 0.3s'
        }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${Math.max(5, Math.min(95, whitePct))}%`,
                background: score >= 5000 ? (myColor === 'w' ? '#4ade80' : '#ef4444') : score <= -5000 ? (myColor === 'b' ? '#4ade80' : '#ef4444') : score > 100 ? '#f8fafc' : score < -100 ? '#475569' : '#fbbf24',
                transition: 'height 0.5s ease', borderTop: '2px solid rgba(0,0,0,0.5)'
            }} />
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700, color: '#64748b', writingMode: 'vertical-rl', textOrientation: 'mixed', zIndex: 2, mixBlendMode: 'difference'
            }}>
                {normalizedScore > 0 ? '+' : ''}{(normalizedScore / 100).toFixed(1)}
            </div>
        </div>
    );
}

export default function ChessGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};
    const mode = locationState.mode || 'solo';
    const roomId = locationState.roomId;
    const difficulty = locationState.difficulty || 'Medium';
    const hasBot = mode === 'solo';
    const myColor = locationState.playerColor || 'w';

    const boardRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [showHistory, setShowHistory] = useState(false);

    const callbacks = useMemo(() => ({
        myColor,
        onMove: () => {},
        onCapture: () => {},
        onCheck: () => {},
        onIllegal: () => {},
        onClick: () => {}
    }), [myColor]);

    const {
        game, turn, isGameOver, winner, selectedSquare, validMoves, moveHistory, evalScore, hintMove, hintSuggestions, isThinkingHint, selectSquare, movePiece, makeAIMove, undoMove, getHint, resetGame
    } = useChessLogic(mode, roomId, difficulty, myColor, callbacks);

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, mode, isGameOver, myColor, makeAIMove]);

    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    const handleSquareClick = (sq) => {
        if (isGameOver) return;
        if (turn !== myColor && mode === 'solo') return; // Wait for CPU

        if (selectedSquare) {
            if (validMoves.includes(sq)) {
                movePiece(sq);
            } else if (game.get(sq)?.color === myColor) {
                selectSquare(sq);
            } else {
                selectSquare(null); // deselect
            }
        } else {
            if (game.get(sq)?.color === myColor) {
                selectSquare(sq);
            }
        }
    };

    const displayRanks = myColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const displayFiles = myColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];


    return (
        <div className="chess-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                {/* LEFT PANEL - CONTROLS */}
                <div className="chess-left-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '0.8rem',
                    padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.6)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '50px', height: '50px', margin: '0 auto 8px',
                            background: 'linear-gradient(135deg, #475569, #1e293b)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(100,116,139,0.3)', border: '2px solid #cbd5e1'
                        }}>
                            <Crown size={28} color="#fff" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '1px' }}>{t('chess.title')}</h2>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>STANDARD</div>
                    </div>

                    {/* Player Info */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '10px', letterSpacing: '1px' }}>{t('chess.info')}</div>
                        <div className="chess-player-avatars" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div className="chess-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#000', fontWeight: 'bold' }}>♔</div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('chess.white')}</div>
                                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.8rem' }}>{myColor === 'w' ? t('chess.you') : t('chess.cpu')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>♚</div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('chess.black')}</div>
                                <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem' }}>{myColor === 'b' ? t('chess.you') : t('chess.cpu')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={undoMove} disabled={isGameOver || moveHistory.length === 0} style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            color: moveHistory.length > 0 ? '#fbbf24' : '#555', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: moveHistory.length > 0 ? 'pointer' : 'default', fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}>
                            <Undo2 size={14} /> {t('chess.redo')}
                        </button>
                        <button onClick={getHint} disabled={isGameOver || turn !== myColor || isThinkingHint} style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            color: (turn === myColor && !isGameOver) ? '#4ade80' : '#555',
                            border: '1px solid rgba(255,255,255,0.08)',
                            cursor: (turn === myColor && !isGameOver) ? 'pointer' : 'default', fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}>
                            <Lightbulb size={14} /> {isThinkingHint ? t('chess.thinking') : t('chess.hint')}
                        </button>
                        {/* Settings button */}
                        <button onClick={() => {}} style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s'
                        }}>
                            <Settings size={14} /> Settings
                        </button>
                    </div>

                    {/* Move History */}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <History size={12} color="#888" />
                                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, letterSpacing: '1px' }}>NƯỚC ({moveHistory.length})</span>
                            </div>
                            {showHistory ? <ChevronDown size={12} color="#888" /> : <ChevronRight size={12} color="#888" />}
                        </div>
                        {showHistory && (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: '0', display: 'flex', flexDirection: 'column' }}>
                                {moveHistory.length === 0 ? (
                                    <p style={{ fontSize: '0.7rem', color: '#555', textAlign: 'center', margin: 'auto' }}>Chưa có nước</p>
                                ) : (
                                    Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                                        <div key={i} style={{
                                            display: 'grid', gridTemplateColumns: 'min-content 1fr 1fr', gap: '8px',
                                            padding: '4px 6px', borderRadius: '4px',
                                            background: i === Math.floor((moveHistory.length - 1) / 2) ? 'rgba(255,255,255,0.04)' : 'transparent',
                                            fontSize: '0.75rem', alignItems: 'center'
                                        }}>
                                            <span style={{ color: '#555', fontSize: '0.65rem' }}>{i + 1}.</span>
                                            <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{moveHistory[i * 2]?.san}</span>
                                            <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom: Zoom + Exit */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomOut size={16} />
                            </button>
                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, minWidth: '38px', textAlign: 'center', userSelect: 'none' }}>
                                {zoomLevel}%
                            </span>
                            <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomIn size={16} />
                            </button>
                        </div>
                        <button onClick={() => navigate('/chess')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> {t('common.exit')}
                        </button>
                    </div>
                </div>

                {/* EVAL BAR (Left of board) */}
                <div style={{
                    width: '24px', height: 'min(75vh, 75vw)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', flexShrink: 0, alignSelf: 'center', marginLeft: '2rem'
                }}>
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: `${Math.max(5, Math.min(95, 50 + evalScore / 20))}%`,
                        background: evalScore > 100 ? '#f8fafc' : evalScore < -100 ? '#1e293b' : '#fbbf24',
                        transition: 'height 0.5s ease', borderTop: '2px solid rgba(0,0,0,0.5)'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 700, color: '#64748b', writingMode: 'vertical-rl', textOrientation: 'mixed', zIndex: 2, mixBlendMode: 'difference'
                    }}>
                        {evalScore > 0 ? '+' : ''}{(evalScore / 100).toFixed(1)}
                    </div>
                </div>

                {/* CENTER BOARD */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
                    <div style={{
                        transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.3s',
                        width: 'min(75vh, 75vw)', height: 'min(75vh, 75vw)',
                        display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
                        border: '8px solid rgba(15, 15, 25, 0.95)', borderRadius: '6px', boxShadow: '0 0 30px rgba(0,0,0,0.6)'
                    }}>
                        {displayRanks.map((r, i) => 
                            displayFiles.map((f, j) => {
                                const sq = f + r;
                                const isLight = (i + j) % 2 === 0;
                                const piece = game.get(sq);
                                
                                const isSelected = selectedSquare === sq;
                                const isValidMove = validMoves.includes(sq);
                                const isHint = hintMove?.from === sq || hintMove?.to === sq;
                                
                                let bg = isLight ? '#f0d9b5' : '#b58863';
                                if (isSelected) bg = 'rgba(79, 172, 254, 0.6)';
                                else if (isHint) bg = 'rgba(251, 191, 36, 0.5)';
                                
                                return (
                                    <div key={sq} onClick={() => handleSquareClick(sq)} style={{
                                        background: bg, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        cursor: isValidMove || (piece && piece.color === myColor && turn === myColor) ? 'pointer' : 'default'
                                    }}>
                                        {isValidMove && !piece && (
                                            <div style={{ width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                        )}
                                        {isValidMove && piece && (
                                            <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(0,0,0,0.2)', borderRadius: '50%' }} />
                                        )}
                                        {piece && (
                                            <div style={{
                                                fontSize: 'min(7vh, 7vw)', color: piece.color === 'w' ? '#fff' : '#1e1e1e',
                                                textShadow: piece.color === 'w' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.5)',
                                                userSelect: 'none', transform: isSelected || isValidMove ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.1s'
                                            }}>
                                                {PIECE_SYMBOLS[piece.color][piece.type]}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - Status only */}
                <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 700, letterSpacing: '1px' }}>TRẠNG THÁI</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: turn === 'w' ? '#f8fafc' : '#94a3b8' }}>
                            {turn === 'w' ? 'TRẮNG' : 'ĐEN'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '6px' }}>
                            {turn === myColor ? 'Bạn đánh' : 'CPU đang nghĩ...'}
                        </div>
                    </div>

                    {hintSuggestions && hintSuggestions.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700, marginBottom: '6px' }}>GỢI Ý NƯỚC ĐI:</div>
                            {hintSuggestions.map((h, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px', borderRadius: '4px' }}>
                                    <span style={{ color: h.color }}>{h.from} → {h.to}</span>
                                    <span style={{ color: '#fff' }}>{h.evalDisplay}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: 'auto' }}>
                        <button onClick={() => navigate('/chess')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', display: 'flex', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                            Thoát
                        </button>
                    </div>
                </div>
            </div>

            {/* GAME OVER MODAL */}
            {isGameOver && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${winner === myColor ? 'rgba(74,222,128,0.4)' : winner === 'draw' ? 'rgba(156,163,175,0.4)' : 'rgba(239,68,68,0.4)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '2.5rem', color: winner === myColor ? '#4ade80' : winner === 'draw' ? '#9ca3af' : '#ef4444', margin: 0, fontWeight: 900 }}>
                            {winner === myColor ? 'CHIẾN THẮNG!' : winner === 'draw' ? 'HÒA CỜ' : 'THẤT BẠI'}
                        </h2>
                        <p style={{ color: '#aaa' }}>{winner === 'w' ? 'Bên Trắng thắng!' : winner === 'b' ? 'Bên Đen thắng!' : 'Ván cờ kết thúc với kết quả Hòa'}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button onClick={resetGame} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                <RotateCcw size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {t('common.playAgain', 'CHƠI LẠI').toUpperCase()}
                            </button>
                            <button onClick={() => navigate('/chess')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                {t('common.exit', 'THOÁT').toUpperCase()}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
}
