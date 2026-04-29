import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Lightbulb, Swords } from 'lucide-react';
import { useXiangqiLogic } from './useXiangqiLogic';

const PIECE_TEXT = {
    'r_k': '帥', 'r_a': '仕', 'r_b': '相', 'r_n': '傌', 'r_r': '俥', 'r_c': '炮', 'r_p': '兵',
    'b_k': '將', 'b_a': '士', 'b_b': '象', 'b_n': '馬', 'b_r': '車', 'b_c': '砲', 'b_p': '卒',
};

export default function XiangqiGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Default to 'r' if 'w' is passed by mistake from older home components
    const rawColor = location.state?.playerColor || 'r';
    const myColor = rawColor === 'w' ? 'r' : rawColor; 
    
    const mode = location.state?.mode || 'solo';
    const difficulty = location.state?.difficulty || 'Medium';
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
        board,
        turn,
        selectedPos,
        validMoves,
        isGameOver,
        winner,
        inCheckColor,
        moveList,
        evalScore,
        hintMove,
        selectPiece,
        movePiece,
        makeAIMove,
        undoMove,
        getHint,
    } = useXiangqiLogic('r', callbacks, mode, roomId);

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove(turn, difficulty);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, mode, isGameOver, myColor, difficulty, makeAIMove]);

    const handleSquareClick = (r, c) => {
        if (isGameOver) return;
        if (turn !== myColor && mode === 'solo') return; // Wait for CPU

        const isSelected = selectedPos?.r === r && selectedPos?.c === c;
        if (isSelected) {
            selectPiece(-1, -1); // deselect (will be caught by illegal/null)
            return;
        }

        const isValidMove = validMoves.some(m => m.r === r && m.c === c);
        if (isValidMove) {
            movePiece(r, c);
        } else {
            selectPiece(r, c);
        }
    };

    const isFlipped = myColor === 'b';

    // Renders the board SVG lines
    const renderBoardLines = () => {
        const lines = [];
        const cellSize = 100 / 9; // 9 columns visually means 8 intervals, but let's use percentage based on 9 cells
        // Actually grid is 9 columns, 10 rows. Centers are at cell widths.
        return (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                {/* Horizontal lines */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <line key={`h${i}`} x1="5.55%" y1={`${i * 10 + 5}%`} x2="94.45%" y2={`${i * 10 + 5}%`} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                ))}
                {/* Vertical lines */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const x = `${i * 11.11 + 5.55}%`;
                    return (
                        <React.Fragment key={`v${i}`}>
                            <line x1={x} y1="5%" x2={x} y2="45%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                            {i === 0 || i === 8 ? (
                                <line x1={x} y1="45%" x2={x} y2="55%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                            ) : null}
                            <line x1={x} y1="55%" x2={x} y2="95%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        </React.Fragment>
                    );
                })}
                {/* Palaces */}
                <line x1="38.88%" y1="5%" x2="61.11%" y2="25%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <line x1="61.11%" y1="5%" x2="38.88%" y2="25%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <line x1="38.88%" y1="75%" x2="61.11%" y2="95%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <line x1="61.11%" y1="75%" x2="38.88%" y2="95%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            </svg>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
        }}>
            {/* LEFT PANEL */}
            <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                <button onClick={() => navigate('/xiangqi')} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', marginBottom: '1rem'
                }}>
                    <ArrowLeft size={16} /> Thoát
                </button>
                <h3 style={{ color: '#f8fafc', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>Lịch sử nước đi</h3>
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px' }}>
                    {moveList.map((m, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: m.color === 'r' ? '#ef4444' : '#94a3b8', padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {i + 1}. {m.notation} {m.captured && '⚔️'}
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER BOARD */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', position: 'relative' }}>
                <div style={{
                    transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.3s',
                    width: 'min(75vh * 0.9, 75vw)', height: 'min(75vh, 75vw / 0.9)',
                    position: 'relative', background: '#d89b65', border: '10px solid #5a3818', borderRadius: '4px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    {renderBoardLines()}
                    <div style={{
                        position: 'absolute', top: '45%', left: '10%', width: '80%', height: '10%',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '2rem',
                        fontWeight: 'bold', color: 'rgba(0,0,0,0.15)', pointerEvents: 'none'
                    }}>
                        <span>楚河</span><span>漢界</span>
                    </div>

                    <div style={{
                        position: 'absolute', inset: 0, display: 'grid',
                        gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', zIndex: 10
                    }}>
                        {Array.from({ length: 10 }).map((_, viewR) => {
                            const r = isFlipped ? 9 - viewR : viewR;
                            return Array.from({ length: 9 }).map((_, viewC) => {
                                const c = isFlipped ? 8 - viewC : viewC;
                                const piece = board[r][c];
                                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                                const isValidMove = validMoves.some(m => m.r === r && m.c === c);
                                const isHint = hintMove?.from.r === r && hintMove?.from.c === c || hintMove?.to.r === r && hintMove?.to.c === c;
                                const isCheckSq = inCheckColor && piece && piece[0] === inCheckColor && piece[2] === 'k';

                                return (
                                    <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)} style={{
                                        position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        cursor: isValidMove || (piece && piece[0] === myColor && turn === myColor && !isGameOver) ? 'pointer' : 'default'
                                    }}>
                                        {isValidMove && !piece && (
                                            <div style={{ width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.6)' }} />
                                        )}
                                        {piece && (
                                            <div style={{
                                                width: '85%', height: '85%', borderRadius: '50%',
                                                background: '#fde0a6', border: `3px solid ${piece[0] === 'r' ? '#dc2626' : '#1e293b'}`,
                                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                fontSize: 'min(5vh, 5vw)', fontWeight: 900,
                                                color: piece[0] === 'r' ? '#dc2626' : '#1e293b',
                                                boxShadow: isSelected ? '0 0 15px #fbbf24' : '0 4px 6px rgba(0,0,0,0.4)',
                                                transform: isSelected || isValidMove ? 'scale(1.1)' : 'scale(1)',
                                                transition: 'all 0.2s', zIndex: 2
                                            }}>
                                                {PIECE_TEXT[piece]}
                                            </div>
                                        )}
                                        {isValidMove && piece && (
                                            <div style={{ position: 'absolute', inset: '10%', border: '4px solid rgba(239, 68, 68, 0.8)', borderRadius: '50%', zIndex: 3 }} />
                                        )}
                                        {isHint && (
                                            <div style={{ position: 'absolute', inset: 0, border: '3px solid #fbbf24', zIndex: 1, pointerEvents: 'none' }} />
                                        )}
                                        {isCheckSq && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none', animation: 'pulse 1s infinite' }} />
                                        )}
                                    </div>
                                );
                            });
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>Lượt đi hiện tại</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: turn === 'r' ? '#ef4444' : '#f8fafc' }}>
                        {turn === 'r' ? 'ĐỎ (Tiên)' : 'ĐEN (Hậu)'}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => undoMove()} disabled={isGameOver} style={{
                        padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#fff', cursor: isGameOver ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
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
                            <button onClick={() => navigate('/xiangqi')} style={{ padding: '12px 24px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                CHƠI LẠI
                            </button>
                            <button onClick={() => navigate('/xiangqi')} style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                THOÁT
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}