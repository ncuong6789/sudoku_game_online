// Force Vite HMR
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, Undo2, Lightbulb, History, ChevronRight, ChevronDown, ZoomIn, ZoomOut, ArrowLeft, RotateCcw, Settings } from 'lucide-react';
import { useXiangqiLogic } from './useXiangqiLogic';
import { useAudio } from '../../utils/useAudio';
import { useTranslation } from 'react-i18next';

const PIECE_TEXT = {
    'r_k': '帥', 'r_a': '仕', 'r_b': '相', 'r_n': '傌', 'r_r': '俥', 'r_c': '炮', 'r_p': '兵',
    'b_k': '將', 'b_a': '士', 'b_b': '象', 'b_n': '馬', 'b_r': '車', 'b_c': '砲', 'b_p': '卒'
};

const PIECE_COLORS = {
    'r': '#dc2626',
    'b': '#1e293b'
};

function EvalBar({ score, myColor }) {
    const normalizedScore = Math.max(-20000, Math.min(20000, score));
    const redPct = 50 + normalizedScore / 20;

    return (
        <div style={{
            width: '24px', height: 'min(75vh, 75vw)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', flexShrink: 0, alignSelf: 'center', marginLeft: '2rem'
        }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${Math.max(5, Math.min(95, redPct))}%`,
                background: score >= 5000 ? '#dc2626' : score <= -5000 ? '#f8fafc' : score > 100 ? '#dc2626' : score < -100 ? '#475569' : '#fbbf24',
                transition: 'height 0.5s ease', borderTop: '2px solid rgba(0,0,0,0.5)'
            }} />
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700, color: '#64748b', writingMode: 'vertical-rl', textOrientation: 'mixed', zIndex: 2
            }}>
                {(normalizedScore / 100).toFixed(1)}
            </div>
        </div>
    );
}

export default function XiangqiGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};
    const roomId = locationState.roomId || 'local';
    const mode = locationState.mode || 'solo';
    const difficulty = locationState.difficulty || 'Medium';

    const myColor = locationState.playerColor || 'r';
    const boardRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [showHistory, setShowHistory] = useState(false);

    const { playXiangqiClickSound, playXiangqiMoveSound, playXiangqiCaptureSound, playXiangqiCheckSound, playXiangqiIllegalSound, playXiangqiWinSound, playXiangqiLossSound } = useAudio();

    const callbacks = useMemo(() => ({
        myColor,
        onMove: playXiangqiMoveSound,
        onCapture: playXiangqiCaptureSound,
        onCheck: playXiangqiCheckSound,
        onIllegal: playXiangqiIllegalSound,
        onClick: playXiangqiClickSound
    }), [myColor, playXiangqiMoveSound, playXiangqiCaptureSound, playXiangqiCheckSound, playXiangqiIllegalSound, playXiangqiClickSound]);

    const {
        board, turn, selectedPos, validMoves, isGameOver, winner, inCheckColor, moveList, evalScore, hintMove, selectPiece, movePiece, makeAIMove, undoMove, getHint
    } = useXiangqiLogic('r', callbacks, mode, roomId);

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove(turn, difficulty);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, mode, isGameOver, myColor, difficulty, makeAIMove]);

    useEffect(() => {
        if (isGameOver && winner) {
            if (winner === myColor) playXiangqiWinSound();
            else playXiangqiLossSound();
        }
    }, [isGameOver, winner, myColor, playXiangqiWinSound, playXiangqiLossSound]);

    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    const handleSquareClick = (r, c) => {
        if (isGameOver) return;
        if (turn !== myColor && mode === 'solo') return;

        const isSelected = selectedPos?.r === r && selectedPos?.c === c;
        if (isSelected) {
            selectPiece(-1, -1);
            return;
        }

        const isValidMove = validMoves?.some(m => m.r === r && m.c === c);
        if (isValidMove) {
            movePiece(r, c);
        } else {
            selectPiece(r, c);
        }
    };

    const resetGame = () => {
        window.location.reload();
    };

    return (
        <div className="xiangqi-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                {/* LEFT PANEL - CONTROLS */}
                <div className="xiangqi-left-panel" style={{
                    flex: '0 0 240px',
                    display: 'flex', flexDirection: 'column', gap: '0.8rem',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(23,23,33,0.6)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '50px', height: '50px', margin: '0 auto 8px',
                            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(220,38,38,0.3)', border: '2px solid #fecaca'
                        }}>
                            <Hexagon size={28} color="#fff" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fca5a5', letterSpacing: '1px' }}>{t('xiangqi.title')}</h2>
                        <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>XIANGQI</div>
                    </div>

                    {/* Move History */}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <History size={12} color="#888" />
                                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, letterSpacing: '1px' }}>{t('xiangqi.moves')} ({moveList.length})</span>
                            </div>
                            {showHistory ? <ChevronDown size={12} color="#888" /> : <ChevronRight size={12} color="#888" />}
                        </div>
                        {showHistory && (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', minHeight: '0' }}>
                                {moveList.length === 0 ? (
                                    <p style={{ fontSize: '0.7rem', color: '#555', textAlign: 'center', margin: '6px 0' }}>{t('xiangqi.noMoves')}</p>
                                ) : (
                                    moveList.map((m, i) => {
                                        const fStr = typeof m.from === 'object' ? `(${m.from.r},${m.from.c})` : String(m.from);
                                        const tStr = typeof m.to   === 'object' ? `(${m.to.r},${m.to.c})`   : String(m.to);
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '3px 4px', borderRadius: '4px',
                                                background: i === moveList.length - 1 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                                fontSize: '0.7rem', color: m.piece && m.piece[0] === 'r' ? '#fca5a5' : '#94a3b8',
                                                fontFamily: 'monospace'
                                            }}>
                                                <span style={{ color: '#555', minWidth: '14px', fontSize: '0.65rem' }}>{i + 1}.</span>
                                                <span>{fStr} → {tStr}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom: Zoom */}
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
                        background: evalScore > 100 ? '#dc2626' : evalScore < -100 ? '#f8fafc' : '#fbbf24',
                        transition: 'height 0.5s ease', borderTop: '2px solid rgba(0,0,0,0.5)'
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 700, color: '#64748b', writingMode: 'vertical-rl', textOrientation: 'mixed', zIndex: 2
                    }}>
                        {(evalScore / 100).toFixed(1)}
                    </div>
                </div>

                {/* CENTER BOARD */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
                    <div style={{
                        transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.3s',
                        height: 'min(75vh, 80vw)',
                        position: 'relative',
                        aspectRatio: '9/10',
                        boxSizing: 'border-box',
                        backgroundColor: '#e6c28f',
                        border: '6px solid #8b5a2b',
                        borderRadius: '3px',
                        boxShadow: '0 0 30px rgba(0,0,0,0.6), inset 0 0 25px rgba(139,90,43,0.3)',
                        overflow: 'hidden',
                        alignSelf: 'center',
                    }}>
                        <svg width="100%" height="100%" viewBox="0 0 900 1000" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
                            <g stroke="#3e2723" strokeWidth="3">
                                {[50, 150, 250, 350, 450, 550, 650, 750, 850, 950].map((y, i) => (
                                    <line key={`h${i}`} x1="50" y1={y} x2="850" y2={y} />
                                ))}
                                {[50, 150, 250, 350, 450, 550, 650, 750, 850].map((x, i) => {
                                    if (i === 0 || i === 8) return <line key={`v${i}`} x1={x} y1="50" x2={x} y2="950" />;
                                    return (
                                        <g key={`v${i}`}>
                                            <line x1={x} y1="50" x2={x} y2="450" />
                                            <line x1={x} y1="550" x2={x} y2="950" />
                                        </g>
                                    );
                                })}
                                <line x1="350" y1="50" x2="550" y2="250" />
                                <line x1="550" y1="50" x2="350" y2="250" />
                                <line x1="350" y1="750" x2="550" y2="950" />
                                <line x1="550" y1="750" x2="350" y2="950" />
                                <text x="250" y="500" textAnchor="middle" dominantBaseline="central" fill="#3e2723" fontSize="48" fontWeight="bold" fontFamily="serif" opacity="0.4" transform="matrix(1, 0, 0, 1.2, 0, -100)">楚  河</text>
                                <text x="650" y="500" textAnchor="middle" dominantBaseline="central" fill="#3e2723" fontSize="48" fontWeight="bold" fontFamily="serif" opacity="0.4" transform="matrix(1, 0, 0, 1.2, 0, -100)">漢  界</text>
                            </g>
                        </svg>

                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {board.map((rowArr, rowIndex) =>
                                rowArr.map((piece, colIndex) => {
                                    const displayRow = myColor === 'b' ? 9 - rowIndex : rowIndex;
                                    const displayCol = myColor === 'b' ? 8 - colIndex : colIndex;
                                    const leftPct = ((50 + displayCol * 100) / 900) * 100;
                                    const topPct = ((50 + displayRow * 100) / 1000) * 100;
                                    const isSelected = selectedPos?.r === rowIndex && selectedPos?.c === colIndex;
                                    const isValidMove = validMoves?.some(m => m.r === rowIndex && m.c === colIndex);
                                    
                                    return (
                                        <React.Fragment key={`${rowIndex}-${colIndex}`}>
                                            {!piece && (
                                                <div
                                                    style={{
                                                        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                        width: '10%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                        pointerEvents: isValidMove ? 'auto' : 'none', cursor: isValidMove ? 'pointer' : 'default',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                    onClick={isValidMove ? () => handleSquareClick(rowIndex, colIndex) : undefined}
                                                >
                                                    {isValidMove && <div style={{ width: '30%', height: '30%', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.3)' }} />}
                                                </div>
                                            )}
                                            {piece && piece === `${inCheckColor}_k` && (
                                                <div style={{
                                                    position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                    width: '12%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                    background: 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, transparent 70%)',
                                                    borderRadius: '50%', pointerEvents: 'none', zIndex: 20,
                                                    animation: 'pulse-glow-xiangqi 1.5s infinite'
                                                }} />
                                            )}
                                            {piece && (
                                                <div
                                                    style={{
                                                        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                        width: '7.2%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                        backgroundColor: PIECE_COLORS[piece[0]],
                                                        borderRadius: '50%',
                                                        border: `2px solid ${PIECE_COLORS[piece[0]]}`,
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 0 6px rgba(139,90,43,0.6)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 'min(22px, 2.8vw)', fontWeight: 900,
                                                        fontFamily: '"KaiTi", "Kaiti SC", "STKaiti", serif',
                                                        color: '#fff',
                                                        textShadow: '0 1px 1px rgba(255,255,255,0.4)',
                                                        pointerEvents: 'auto',
                                                        cursor: (turn === myColor && piece[0] === myColor) ? 'pointer' : 'default',
                                                        zIndex: 30,
                                                        transition: 'left 0.3s ease, top 0.3s ease'
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                >
                                                    <div style={{
                                                        position: 'absolute', inset: '2px', border: `1px solid rgba(255,255,255,0.3)`, borderRadius: '50%'
                                                    }}></div>
                                                    {isValidMove && <div style={{ position: 'absolute', inset: '-6px', border: '4px solid rgba(0,0,0,0.3)', borderRadius: '50%' }}></div>}
                                                    {PIECE_TEXT[piece]}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Hint marker */}
                    {hintMove && (() => {
                        const fromR = typeof hintMove.from === 'object' ? hintMove.from.r : Number(String(hintMove.from).split(',')[0]);
                        const fromC = typeof hintMove.from === 'object' ? hintMove.from.c : Number(String(hintMove.from).split(',')[1]);
                        const toR   = typeof hintMove.to   === 'object' ? hintMove.to.r   : Number(String(hintMove.to).split(',')[0]);
                        const toC   = typeof hintMove.to   === 'object' ? hintMove.to.c   : Number(String(hintMove.to).split(',')[1]);
                        const displayFromR = myColor === 'b' ? 9 - fromR : fromR;
                        const displayFromC = myColor === 'b' ? 8 - fromC : fromC;
                        const displayToR   = myColor === 'b' ? 9 - toR   : toR;
                        const displayToC   = myColor === 'b' ? 8 - toC   : toC;
                        const leftPctFrom = ((50 + displayFromC * 100) / 900) * 100;
                        const topPctFrom  = ((50 + displayFromR * 100) / 1000) * 100;
                        const leftPctTo   = ((50 + displayToC   * 100) / 900) * 100;
                        const topPctTo    = ((50 + displayToR   * 100) / 1000) * 100;
                        return (
                            <>
                                <div style={{ position: 'absolute', left: `${leftPctFrom}%`, top: `${topPctFrom}%`, width: '10%', aspectRatio: '1', transform: 'translate(-50%, -50%)', border: '3px solid #fbbf24', borderRadius: '50%', pointerEvents: 'none', zIndex: 40, boxShadow: '0 0 12px #fbbf24' }} />
                                <div style={{ position: 'absolute', left: `${leftPctTo}%`,   top: `${topPctTo}%`,   width: '10%', aspectRatio: '1', transform: 'translate(-50%, -50%)', border: '3px solid #4ade80', borderRadius: '50%', pointerEvents: 'none', zIndex: 40, boxShadow: '0 0 12px #4ade80' }} />
                            </>
                        );
                    })()}
                </div>

                {/* RIGHT PANEL - Status and Actions */}
                <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', padding: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(23,23,33,0.6)' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px', fontWeight: 800, letterSpacing: '1px', textAlign: 'center' }}>THÔNG TIN TRẬN ĐẤU</div>
                            
                            {/* Red Player */}
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px',
                                background: turn === 'r' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                border: turn === 'r' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>帥</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('xiangqi.redSide')}</div>
                                    <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.8rem' }}>{myColor === 'r' ? t('xiangqi.redPlayer') : (mode === 'multiplayer' ? 'Đối thủ' : t('xiangqi.blackPlayer'))}</div>
                                </div>
                                {turn === 'r' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />}
                            </div>

                            <div style={{ width: '2px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '4px auto' }} />

                            {/* Black Player */}
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px',
                                background: turn === 'b' ? 'rgba(74,222,128,0.1)' : 'transparent',
                                border: turn === 'b' ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 'bold' }}>將</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('xiangqi.blackSide')}</div>
                                    <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem' }}>{myColor === 'b' ? t('xiangqi.redPlayer') : (mode === 'multiplayer' ? 'Đối thủ' : t('xiangqi.blackPlayer'))}</div>
                                </div>
                                {turn === 'b' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />}
                            </div>
                            
                            {inCheckColor ? (
                                <div style={{ marginTop: '16px', padding: '6px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, animation: 'pulse-glow-xiangqi 1.5s infinite' }}>⚠ ĐANG BỊ CHIẾU!</div>
                            ) : (
                                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                                    {turn === myColor ? 'Tới lượt của bạn' : 'CPU đang suy nghĩ...'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={undoMove} disabled={isGameOver || moveList.length === 0} style={{
                                width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                color: moveList.length > 0 ? '#fbbf24' : '#555', border: '1px solid rgba(255,255,255,0.08)',
                                cursor: moveList.length > 0 ? 'pointer' : 'default', fontSize: '0.8rem',
                                transition: 'all 0.2s', fontWeight: 600
                            }}>
                                <Undo2 size={16} /> {t('xiangqi.undo')}
                            </button>
                            <button onClick={getHint} disabled={isGameOver || turn !== myColor} style={{
                                width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                color: (turn === myColor && !isGameOver) ? '#4ade80' : '#555',
                                border: '1px solid rgba(255,255,255,0.08)',
                                cursor: (turn === myColor && !isGameOver) ? 'pointer' : 'default', fontSize: '0.8rem',
                                transition: 'all 0.2s', fontWeight: 600
                            }}>
                                <Lightbulb size={16} /> {t('xiangqi.hint')}
                            </button>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <button onClick={() => navigate('/xiangqi')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> {t('common.exit', 'Thoát')}
                        </button>
                    </div>
                </div>
            </div>

            {/* GAME OVER MODAL */}
            {isGameOver && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${winner === myColor ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '2.5rem', color: winner === myColor ? '#4ade80' : '#ef4444', margin: 0, fontWeight: 900 }}>
                            {winner === myColor ? t('xiangqi.victory') : t('xiangqi.defeat')}
                        </h2>
                        <p style={{ color: '#aaa' }}>{winner === 'r' ? t('xiangqi.redWins') : t('xiangqi.blackWins')}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                <RotateCcw size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {t('common.playAgain', 'CHƠI LẠI').toUpperCase()}
                            </button>
                            <button onClick={() => navigate('/xiangqi')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
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
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.3); }
                    100% { transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes pulse-glow-xiangqi {
                    0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.2); }
                }
            `}</style>
        </div>
    );
}
