import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Lightbulb } from 'lucide-react';
import { useChessLogic } from './useChessLogic';

const PIECE_SYMBOLS = {
    w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
    b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }
};

export default function ChessGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    
    const mode = location.state?.mode || 'solo';
    const difficulty = location.state?.difficulty || 'Medium';
    const myColor = location.state?.playerColor || 'w';
    const roomId = location.state?.roomId || null;

    const [zoomLevel, setZoomLevel] = useState(100);

    const callbacks = {
        myColor,
        onMove: () => {},
        onCapture: () => {},
        onCheck: () => {},
        onIllegal: () => {},
        onClick: () => {}
    };

    const {
        game,
        turn,
        isGameOver,
        winner,
        selectedSquare,
        validMoves,
        moveHistory,
        evalScore,
        hintMove,
        hintSuggestions,
        selectSquare,
        movePiece,
        makeAIMove,
        undoMove,
        getHint,
        resetGame
    } = useChessLogic(mode, roomId, difficulty, myColor, callbacks);

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, mode, isGameOver, myColor, makeAIMove]);

    const isFlipped = myColor === 'b';

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

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    const displayFiles = isFlipped ? [...files].reverse() : files;
    const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
        }}>
            {/* LEFT PANEL */}
            <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                <button onClick={() => navigate('/chess')} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', marginBottom: '1rem'
                }}>
                    <ArrowLeft size={16} /> Thoát
                </button>
                <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>Lịch sử nước đi</h3>
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px' }}>
                    {moveHistory.map((m, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: m.color === 'w' ? '#f8fafc' : '#94a3b8', padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {i + 1}. {m.san}
                        </div>
                    ))}
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
                    background: evalScore > 100 ? '#f8fafc' : evalScore < -100 ? '#1e293b' : '#94a3b8',
                    transition: 'height 0.5s ease', borderTop: '2px solid rgba(0,0,0,0.5)'
                }} />
            </div>

            {/* CENTER BOARD */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
                <div style={{
                    transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.3s',
                    width: 'min(75vh, 75vw)', height: 'min(75vh, 75vw)',
                    display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
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

            {/* RIGHT PANEL */}
            <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>Lượt đi hiện tại</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: turn === 'w' ? '#f8fafc' : '#94a3b8' }}>
                        {turn === 'w' ? 'TRẮNG (White)' : 'ĐEN (Black)'}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={undoMove} disabled={isGameOver || mode !== 'solo'} style={{
                        padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#fff', cursor: isGameOver || mode !== 'solo' ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        <RotateCcw size={16} /> Đi Lại
                    </button>
                    <button onClick={getHint} disabled={isGameOver || turn !== myColor} style={{
                        padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#fff', cursor: isGameOver || turn !== myColor ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
                    }}>
                        <Lightbulb size={16} /> Gợi ý
                    </button>
                </div>
                
                {hintSuggestions && hintSuggestions.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, marginBottom: '8px' }}>Gợi ý nước đi:</div>
                        {hintSuggestions.map((h, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px', borderRadius: '4px' }}>
                                <span style={{ color: h.color }}>{h.from} → {h.to}</span>
                                <span style={{ color: '#fff' }}>{h.evalDisplay}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ZOOM CONTROLS */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '12px' }}>
                        <button onClick={() => setZoomLevel(z => Math.max(z - 10, 60))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><ZoomOut size={18} /></button>
                        <span style={{ color: '#fff', fontSize: '0.8rem', minWidth: '40px', textAlign: 'center' }}>{zoomLevel}%</span>
                        <button onClick={() => setZoomLevel(z => Math.min(z + 10, 200))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><ZoomIn size={18} /></button>
                    </div>
                </div>
            </div>

            {/* GAMEOVER OVERLAY */}
            {isGameOver && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'rgba(30,30,40,0.95)', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, color: winner === myColor ? '#4ade80' : '#ef4444' }}>
                            {winner === 'draw' ? 'HÒA!' : winner === myColor ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
                        </h2>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
                            <button onClick={resetGame} style={{ padding: '12px 24px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                CHƠI LẠI
                            </button>
                            <button onClick={() => navigate('/chess')} style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                THOÁT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}