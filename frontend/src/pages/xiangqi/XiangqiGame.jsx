import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Undo2, Lightbulb, History, ChevronRight, ChevronDown, Activity, Hexagon, ZoomIn, ZoomOut } from 'lucide-react';
import { useXiangqiLogic } from './useXiangqiLogic';
import { useAudio } from '../../utils/useAudio';
import { useTranslation } from 'react-i18next';

const PIECE_TEXT = {
    'r_k': '帥', 'r_a': '仕', 'r_b': '相', 'r_n': '傌', 'r_r': '俥', 'r_c': '炮', 'r_p': '兵',
    'b_k': '將', 'b_a': '士', 'b_b': '象', 'b_n': '馬', 'b_r': '車', 'b_c': '砲', 'b_p': '卒',
};

const PIECE_COLORS = {
    'r': '#dc2626',
    'b': '#1e293b'
};

function EvalBar({ score, myColor }) {
    const normalizedScore = Math.max(-2000, Math.min(2000, score));
    const redPct = myColor === 'r'
        ? 50 + (normalizedScore / 2000) * 50
        : 50 - (normalizedScore / 2000) * 50;

    return (
        <div style={{
            width: '12px', height: '100%', borderRadius: '6px', overflow: 'hidden',
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative', flexShrink: 0, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
        }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${redPct}%`, background: '#dc2626',
                boxShadow: '0 0 10px rgba(220,38,38,0.5)',
                transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '-4px', right: '-4px', height: '2px', background: 'rgba(255,255,255,0.3)', zIndex: 2 }} />
            <div style={{
                position: 'absolute', [redPct > 50 ? 'bottom' : 'top']: '10px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                zIndex: 3, writingMode: 'vertical-rl'
            }}>
                {Math.abs(normalizedScore) >= 900 ? 'M' : (Math.abs(normalizedScore) / 100).toFixed(1)}
            </div>
        </div>
    );
}

export default function XiangqiGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const {
        playXiangqiClickSound, playXiangqiMoveSound, playXiangqiCaptureSound,
        playXiangqiCheckSound, playXiangqiIllegalSound, playXiangqiWinSound, playXiangqiLossSound
    } = useAudio();

    const myColor = playerColor === 'w' ? 'r' : 'b';
    const {
        board,
        turn,
        selectedPos,
        isGameOver,
        winner,
        inCheckColor,
        selectPiece,
        movePiece,
        makeAIMove,
        undoMove,
        getHint,
        validMoves,
        moveList,
        evalScore,
        hintMove,
    } = useXiangqiLogic('r', {
        onClick: playXiangqiClickSound,
        onMove: playXiangqiMoveSound,
        onCapture: playXiangqiCaptureSound,
        onCheck: playXiangqiCheckSound,
        onIllegal: playXiangqiIllegalSound,
        myColor,
    });

    const [showHistory, setShowHistory] = useState(false);
    const isThinking = mode === 'solo' && !isGameOver && turn !== myColor;

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove(turn, difficulty);
            }, 150);
            return () => { clearTimeout(timer); };
        }
    }, [turn, mode, isGameOver, myColor, difficulty, makeAIMove]);

    useEffect(() => {
        if (isGameOver) {
            if (winner === myColor) playXiangqiWinSound();
            else playXiangqiLossSound();
        }
    }, [isGameOver, winner, myColor, playXiangqiWinSound, playXiangqiLossSound]);

    const handleSquareClick = (r, c) => {
        if (isGameOver || turn !== myColor) return;
        if (selectedPos && validMoves.some(m => m.r === r && m.c === c)) {
            movePiece(r, c);
        } else {
            selectPiece(r, c);
        }
    };

    const handleUndo = () => {
        if (mode === 'solo' && history.length >= 2) {
            undoMove(2);
        } else {
            undoMove(1);
        }
    };

    const handleHint = () => {
        getHint();
    };

    const [zoomLevel, setZoomLevel] = useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    return (
        <div className="xiangqi-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                {/* LEFT CONTROL PANEL */}
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

                    {/* Player Info */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '10px', letterSpacing: '1px' }}>{t('xiangqi.info')}</div>

                        <div className="xiangqi-player-avatars" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div className="xiangqi-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>帥</div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('xiangqi.redSide')}</div>
                                <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.8rem' }}>{myColor === 'r' ? t('xiangqi.redPlayer') : t('xiangqi.blackPlayer')}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#f8fafc', fontWeight: 'bold' }}>將</div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{t('xiangqi.blackSide')}</div>
                                <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem' }}>{myColor === 'b' ? t('xiangqi.redPlayer') : t('xiangqi.blackPlayer')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={handleUndo} disabled={isGameOver || moveList.length === 0} style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            color: moveList.length > 0 ? '#fbbf24' : '#555', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: moveList.length > 0 ? 'pointer' : 'default', fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}>
                            <Undo2 size={14} /> {t('xiangqi.undo')}
                        </button>
                        <button onClick={handleHint} disabled={isGameOver || turn !== myColor} style={{
                            padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            color: (turn === myColor && !isGameOver) ? '#4ade80' : '#555',
                            border: '1px solid rgba(255,255,255,0.08)',
                            cursor: (turn === myColor && !isGameOver) ? 'pointer' : 'default', fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}>
                            <Lightbulb size={14} /> {t('xiangqi.hint')}
                        </button>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        <button onClick={() => navigate('/xiangqi')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> Thoát khỏi phòng
                        </button>
                    </div>
                </div>

                {/* EVAL BAR + CENTER BOARD */}
                <div className="xiangqi-board-area" style={{
                    flex: '1 1 auto', display: 'flex', justifyContent: 'center',
                    minWidth: 0, minHeight: 0, gap: '12px', padding: '1rem',
                    overflow: 'auto', alignItems: 'center', position: 'relative'
                }}>


                    <div style={{ display: 'flex', gap: '12px', height: zoomLevel > 100 ? `${600 * (zoomLevel/100)}px` : 'min(80vw - 70px, 85vh)' }}>
                        <EvalBar score={evalScore} myColor={myColor} />

                        <div className="xiangqi-board-container" style={{
                            position: 'relative',
                            height: '100%',
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
                                    const isValidMove = validMoves.some(m => m.r === rowIndex && m.c === colIndex);
                                    const isHintFrom = hintMove?.from.r === rowIndex && hintMove?.from.c === colIndex;
                                    const isHintTo = hintMove?.to.r === rowIndex && hintMove?.to.c === colIndex;

                                    return (
                                        <React.Fragment key={`${rowIndex}-${colIndex}`}>
                                            {isValidMove && !piece && (
                                                <div
                                                    style={{
                                                        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                        width: '5%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                        backgroundColor: 'rgba(74, 222, 128, 0.7)', borderRadius: '50%',
                                                        pointerEvents: 'auto', cursor: 'pointer', zIndex: 20
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                />
                                            )}

                                            {isValidMove && piece && (
                                                <div
                                                    style={{
                                                        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                        width: '10%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                        border: '4px solid rgba(239, 68, 68, 0.9)', borderRadius: '50%',
                                                        pointerEvents: 'none', zIndex: 40,
                                                    }}
                                                />
                                            )}

                                            {isHintTo && !piece && (
                                                <div style={{
                                                    position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                    width: '6%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                    backgroundColor: 'rgba(74, 222, 128, 0.9)', borderRadius: '50%',
                                                    pointerEvents: 'none', zIndex: 45,
                                                    animation: 'pulse 1s ease-in-out infinite',
                                                    boxShadow: '0 0 12px rgba(74,222,128,0.6)'
                                                }} />
                                            )}

                                            {!piece && !isValidMove && !isHintTo && (
                                                <div
                                                    style={{
                                                        position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                        width: '10%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                        pointerEvents: 'auto', cursor: 'default'
                                                    }}
                                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                />
                                            )}

                                            {piece && (() => {
                                                const isKingInCheck = inCheckColor && piece === `${inCheckColor}_k`;
                                                return (
                                                    <div
                                                        style={{
                                                            position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                                                            width: '7.2%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                            backgroundColor: isHintFrom ? '#4ade80' : isHintTo ? '#4ade80' : '#e6c28f',
                                                            borderRadius: '50%',
                                                            border: `2px solid ${isSelected ? '#fbbf24' : isHintFrom || isHintTo ? '#4ade80' : isKingInCheck ? '#ef4444' : '#8b5a2b'}`,
                                                            boxShadow: isSelected
                                                                ? '0 0 12px #fbbf24, inset 0 0 6px rgba(0,0,0,0.4)'
                                                                : isHintFrom || isHintTo
                                                                    ? '0 0 12px rgba(74,222,128,0.7), inset 0 0 6px rgba(74,222,128,0.2)'
                                                                    : isKingInCheck
                                                                        ? '0 0 14px rgba(239,68,68,0.8), inset 0 0 8px rgba(239,68,68,0.5)'
                                                                        : '0 2px 6px rgba(0,0,0,0.5), inset 0 0 6px rgba(139,90,43,0.6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 'min(22px, 2.8vw)', fontWeight: 900,
                                                            fontFamily: '"KaiTi", "Kaiti SC", "STKaiti", serif',
                                                            color: PIECE_COLORS[piece[0]],
                                                            textShadow: '0 1px 1px rgba(255,255,255,0.4)',
                                                            pointerEvents: 'auto',
                                                            cursor: (turn === myColor && piece[0] === myColor) ? 'pointer' : isValidMove ? 'pointer' : 'default',
                                                            zIndex: 30,
                                                            transition: 'left 0.3s ease, top 0.3s ease'
                                                        }}
                                                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                                                    >
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
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                                <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${winner === myColor ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <h2 style={{ fontSize: '2.5rem', color: winner === myColor ? '#4ade80' : '#ef4444', margin: 0, fontWeight: 900 }}>
                                        {winner === myColor ? t('xiangqi.victory') : t('xiangqi.defeat')}
                                    </h2>
                                    <p style={{ color: '#aaa' }}>{winner === 'r' ? t('xiangqi.redWins') : t('xiangqi.blackWins')}</p>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                            <RotateCcw size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {t('common.playAgain').toUpperCase()}
                                        </button>
                                        <button onClick={() => navigate('/xiangqi')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                            {t('common.exit').toUpperCase()}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                </div>

                {/* RIGHT PANEL - Status + History */}
                <div className="xiangqi-right-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: '0.8rem', overflowY: 'auto', padding: '1.5rem',
                    borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(23,23,33,0.6)'
                }}>
                    {/* Turn Status */}
                    <div style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.08), transparent)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(234,179,8,0.15)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800, marginBottom: '8px', letterSpacing: '1px' }}>
                            {t('xiangqi.status')}
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '4px' }}>{t('xiangqi.turnLabel')}:</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: turn === 'r' ? '#ef4444' : '#94a3b8' }}>
                                {turn === 'r' ? 'RED' : 'BLACK'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isThinking ? '#fbbf24' : '#666', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {isThinking && <Activity size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                                {turn === myColor ? t('xiangqi.redPlayer') : t('xiangqi.thinking')}
                            </div>
                        </div>
                        {inCheckColor && (
                            <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                {t('xiangqi.check')}
                            </div>
                        )}
                    </div>

                    {/* Eval */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px' }}>{t('xiangqi.evaluate')}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                flex: 1, height: '6px', borderRadius: '3px', background: '#1e293b', overflow: 'hidden', position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                    width: `${Math.max(3, Math.min(97, 50 + (evalScore / 25)))}%`,
                                    background: evalScore > 0 ? '#dc2626' : evalScore < 0 ? '#475569' : '#fbbf24',
                                    transition: 'width 0.4s ease, background 0.3s',
                                    borderRadius: '3px'
                                }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: evalScore > 0 ? '#ef4444' : evalScore < 0 ? '#94a3b8' : '#fbbf24', minWidth: '32px', textAlign: 'right' }}>
                                {(evalScore / 100).toFixed(1)}
                            </span>
                        </div>
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
                                    moveList.map((m, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 4px', borderRadius: '4px',
                                            background: i === moveList.length - 1 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                            fontSize: '0.7rem', color: m.color === 'r' ? '#fca5a5' : '#94a3b8',
                                            fontFamily: 'monospace'
                                        }}>
                                            <span style={{ color: '#555', minWidth: '14px', fontSize: '0.65rem' }}>{i + 1}.</span>
                                            <span>{m.notation}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

                @media (max-width: 850px) {
                    .xiangqi-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .xiangqi-left-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        max-height: none !important;
                    }
                    .xiangqi-board-area {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        padding: 0.5rem !important;
                    }
                    .xiangqi-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-left: none !important;
                        border-top: 1px solid rgba(255,255,255,0.06) !important;
                        padding: 0.5rem !important;
                    }
                    .xiangqi-top-bar {
                        padding: 8px 12px !important;
                    }
                    .xiangqi-top-bar h1 {
                        font-size: 1rem !important;
                    }
                }

                @media (max-width: 480px) {
                    .xiangqi-left-panel {
                        padding: 0.5rem !important;
                    }
                    .xiangqi-player-avatars {
                        gap: 6px !important;
                    }
                    .xiangqi-avatar {
                        width: 24px !important;
                        height: 24px !important;
                        font-size: 0.75rem !important;
                    }
                    .xiangqi-board-container {
                        border-width: 4px !important;
                    }
                    .xiangqi-piece {
                        font-size: min(18px, 3.5vw) !important;
                    }
                }
            `}</style>
        </div>
    );
}
