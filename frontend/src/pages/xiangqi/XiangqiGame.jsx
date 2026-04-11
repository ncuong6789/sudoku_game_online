import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useXiangqiLogic } from './useXiangqiLogic';
import { useAudio } from '../../utils/useAudio';

// Unicode for Pieces
const PIECE_TEXT = {
    'r_k': '帥', 'r_a': '仕', 'r_b': '相', 'r_n': '傌', 'r_r': '俥', 'r_c': '炮', 'r_p': '兵',
    'b_k': '將', 'b_a': '士', 'b_b': '象', 'b_n': '馬', 'b_r': '車', 'b_c': '砲', 'b_p': '卒',
};

// Colors
const PIECE_COLORS = {
    'r': '#dc2626', // Red
    'b': '#1e293b'  // Black
};

export default function XiangqiGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const { 
        playXiangqiClickSound, playXiangqiMoveSound, playXiangqiCaptureSound, 
        playXiangqiCheckSound, playXiangqiIllegalSound, playXiangqiWinSound, playXiangqiLossSound 
    } = useAudio();

    const myColor = playerColor === 'w' ? 'r' : 'b'; // w maps to red, b to black
    const {
        board,
        turn,
        selectedPos,
        isGameOver,
        winner,
        inCheckColor,
        selectPiece,
        movePiece,
        makeAIMove
    } = useXiangqiLogic('r', {
        onClick: playXiangqiClickSound,
        onMove: playXiangqiMoveSound,
        onCapture: playXiangqiCaptureSound,
        onCheck: playXiangqiCheckSound,
        onIllegal: playXiangqiIllegalSound
    }); // Red always goes first

    // AI Move
    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            // Minimal layout delay since AI is async
            const timer = setTimeout(() => {
                makeAIMove(turn);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [turn, mode, isGameOver, myColor, makeAIMove]);

    // Game Over Sound
    useEffect(() => {
        if (isGameOver) {
            if (winner === myColor) playXiangqiWinSound();
            else playXiangqiLossSound();
        }
    }, [isGameOver, winner, myColor, playXiangqiWinSound, playXiangqiLossSound]);

    const handleSquareClick = (r, c) => {
        if (isGameOver || turn !== myColor) return;

        // If clicking on a valid move highlight
        if (selectedPos && validMoves.some(m => m.r === r && m.c === c)) {
            movePiece(r, c);
        } else {
            // Otherwise try to select a piece
            selectPiece(r, c);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
            overflow: 'hidden', padding: '1rem', boxSizing: 'border-box'
        }}>
            <div style={{
                position: 'relative', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
                padding: '1.5rem', gap: '2rem', alignItems: 'stretch', justifyContent: 'center',
                height: '100%', maxHeight: '850px', width: '100%', maxWidth: '1200px',
                borderRadius: '24px', background: 'rgba(23, 23, 33, 0.85)', backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                boxSizing: 'border-box'
            }}>
                {/* LEFT CONTROL PANEL */}
                <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fca5a5', letterSpacing: '2px' }}>CỜ TƯỚNG</h1>
                        <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 800 }}>TRẬN BÀN GỖ</div>
                    </div>

                    <button onClick={() => navigate('/xiangqi')} style={{
                        padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                    }}>
                        <ArrowLeft size={18} /> THOÁT
                    </button>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 800, marginBottom: '15px' }}>THÔNG TIN TRẬN</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>帥</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Phe Đỏ (Tiên)</div>
                                <div style={{ fontWeight: 'bold', color: '#fca5a5' }}>{myColor === 'r' ? 'Bạn' : 'Máy (AI)'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 'bold' }}>將</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>Phe Đen (Hậu)</div>
                                <div style={{ fontWeight: 'bold', color: '#94a3b8' }}>{myColor === 'b' ? 'Bạn' : 'Máy (AI)'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER BOARD */}
                <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, minHeight: 0 }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        maxHeight: '100%',
                        aspectRatio: '9/10', // Xiangqi ratio
                        backgroundColor: '#e6c28f', // Wooden board color
                        border: '10px solid #8b5a2b', // Darker wood frame
                        borderRadius: '4px',
                        boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 40px rgba(139,90,43,0.5)',
                        overflow: 'hidden'
                    }}>
                        {/* THE SVG BOARD LINES */}
                        <svg width="100%" height="100%" viewBox="0 0 900 1000" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
                            <g stroke="#3e2723" strokeWidth="3">
                                {/* 10 Horizontal lines */}
                                {[50, 150, 250, 350, 450, 550, 650, 750, 850, 950].map((y, i) => (
                                    <line key={`h${i}`} x1="50" y1={y} x2="850" y2={y} />
                                ))}
                                {/* Vertical lines logic */}
                                {[50, 150, 250, 350, 450, 550, 650, 750, 850].map((x, i) => {
                                    if (i === 0 || i === 8) {
                                        return <line key={`v${i}`} x1={x} y1="50" x2={x} y2="950" />;
                                    }
                                    return (
                                        <g key={`v${i}`}>
                                            <line x1={x} y1="50" x2={x} y2="450" />
                                            <line x1={x} y1="550" x2={x} y2="950" />
                                        </g>
                                    );
                                })}
                                {/* Palaces (X cross lines) */}
                                {/* Top Palace (Black) */}
                                <line x1="350" y1="50" x2="550" y2="250" />
                                <line x1="550" y1="50" x2="350" y2="250" />
                                {/* Bottom Palace (Red) */}
                                <line x1="350" y1="750" x2="550" y2="950" />
                                <line x1="550" y1="750" x2="350" y2="950" />
                                
                                {/* River text */}
                                <text x="250" y="500" textAnchor="middle" dominantBaseline="central" fill="#3e2723" fontSize="48" fontWeight="bold" fontFamily="serif" opacity="0.4" transform="matrix(1, 0, 0, 1.2, 0, -100)">楚  河</text>
                                <text x="650" y="500" textAnchor="middle" dominantBaseline="central" fill="#3e2723" fontSize="48" fontWeight="bold" fontFamily="serif" opacity="0.4" transform="matrix(1, 0, 0, 1.2, 0, -100)">漢  界</text>
                            </g>
                        </svg>

                        {/* PIECES AND HIGHLIGHTS RENDERED ON TOP */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {board.map((rowArr, rowIndex) => 
                                rowArr.map((piece, colIndex) => {
                                    // Visual Rotation for Black Player
                                    const displayRow = myColor === 'b' ? 9 - rowIndex : rowIndex;
                                    const displayCol = myColor === 'b' ? 8 - colIndex : colIndex;
                                    
                                    const leftPct = ((50 + displayCol * 100) / 900) * 100;
                                    const topPct = ((50 + displayRow * 100) / 1000) * 100;
                                    
                                    const isSelected = selectedPos?.r === rowIndex && selectedPos?.c === colIndex;
                                    const isValidMove = validMoves.some(m => m.r === rowIndex && m.c === colIndex);

                                    return (
                                        <React.Fragment key={`${rowIndex}-${colIndex}`}>
                                            {/* Valid move dot indicator (only for empty spots usually, but we overlay it anyway) */}
                                            {isValidMove && !piece && (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPct}%`,
                                                        top: `${topPct}%`,
                                                        width: '20px',
                                                        height: '20px',
                                                        transform: 'translate(-50%, -50%)',
                                                        backgroundColor: 'rgba(74, 222, 128, 0.7)',
                                                        borderRadius: '50%',
                                                        pointerEvents: 'auto',
                                                        cursor: 'pointer',
                                                        zIndex: 20
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                />
                                            )}
                                            
                                            {/* Valid move target ring (if spot has enemy piece) */}
                                            {isValidMove && piece && (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPct}%`,
                                                        top: `${topPct}%`,
                                                        width: 'min(65px, 7.5vw)',
                                                        height: 'min(65px, 7.5vw)',
                                                        transform: 'translate(-50%, -50%)',
                                                        border: '4px solid rgba(239, 68, 68, 0.9)',
                                                        borderRadius: '50%',
                                                        pointerEvents: 'none',
                                                        zIndex: 40, // Ensure it draws ABOVE the piece
                                                    }}
                                                />
                                            )}

                                            {/* Invisible Clickable Area for Empty Intersections */}
                                            {!piece && !isValidMove && (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPct}%`,
                                                        top: `${topPct}%`,
                                                        width: 'min(40px, 4.5vw)',
                                                        height: 'min(40px, 4.5vw)',
                                                        transform: 'translate(-50%, -50%)',
                                                        pointerEvents: 'auto',
                                                        cursor: 'default'
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                />
                                            )}

                                            {/* PIECE VISUAL */}
                                            {piece && (() => {
                                                const isKingInCheck = inCheckColor && piece === `${inCheckColor}_k`;
                                                return (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${leftPct}%`,
                                                        top: `${topPct}%`,
                                                        width: 'min(55px, 6.5vw)',
                                                        height: 'min(55px, 6.5vw)',
                                                        transform: 'translate(-50%, -50%)',
                                                        backgroundColor: '#e6c28f', // Wood base
                                                        borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? '#fbbf24' : isKingInCheck ? '#ef4444' : '#8b5a2b'}`,
                                                        boxShadow: isSelected 
                                                            ? '0 0 20px #fbbf24, inset 0 0 10px rgba(0,0,0,0.5)'
                                                            : isKingInCheck
                                                                ? '0 0 20px rgba(239,68,68,0.9), inset 0 0 15px rgba(239,68,68,0.6)'
                                                                : '0 4px 10px rgba(0,0,0,0.6), inset 0 0 10px rgba(139,90,43,0.8)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 'min(35px, 4vw)',
                                                        fontWeight: 900,
                                                        fontFamily: '"KaiTi", "Kaiti SC", "STKaiti", serif', // Chinese Calligraphy font
                                                        color: PIECE_COLORS[piece[0]],
                                                        textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                                                        pointerEvents: 'auto',
                                                        cursor: (turn === myColor && piece[0] === myColor) ? 'pointer' : isValidMove ? 'pointer' : 'default',
                                                        zIndex: 30,
                                                        transition: 'left 0.3s ease, top 0.3s ease'
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                >
                                                    {/* Inner Ring Design typical of Xiangqi wooden pieces */}
                                                    <div style={{
                                                        position: 'absolute', inset: '4px', border: `1px solid ${PIECE_COLORS[piece[0]]}55`, borderRadius: '50%'
                                                    }}></div>
                                                    {PIECE_TEXT[piece]}
                                                </div>
                                                );
                                            })()}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </div>

                        {/* GAME OVER MODAL */}
                        {isGameOver && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                                <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${winner === myColor ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <h2 style={{ fontSize: '2.5rem', color: winner === myColor ? '#4ade80' : '#ef4444', margin: 0, fontWeight: 900 }}>
                                        {winner === myColor ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}
                                    </h2>
                                    <p style={{ color: '#aaa' }}>{winner === 'r' ? 'Phe Đỏ (Tiên) thắng!' : 'Phe Đen (Hậu) thắng!'}</p>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                            <RotateCcw size={16} style={{display:'inline', verticalAlign:'text-bottom'}} /> CHƠI LẠI
                                        </button>
                                        <button onClick={() => navigate('/xiangqi')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                            THOÁT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* RIGHT PANEL - Status */}
                <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                     <div style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.1), transparent)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 800, marginBottom: '20px', letterSpacing: '1px' }}>
                            Trạng thái
                        </div>
                        <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>Lượt đánh của:</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: turn === 'r' ? '#ef4444' : '#94a3b8' }}>
                                {turn === 'r' ? 'ĐỎ' : 'ĐEN'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                                {turn === myColor ? '(Lượt của bạn)' : '(Đang suy nghĩ...)'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
