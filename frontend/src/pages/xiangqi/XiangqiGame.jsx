import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Undo2, Lightbulb, History, ChevronRight, ChevronDown, Activity } from 'lucide-react';
import { useXiangqiLogic } from './useXiangqiLogic';
import { useAudio } from '../../utils/useAudio';

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
            width: '28px', height: '100%', borderRadius: '14px', overflow: 'hidden',
            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative', flexShrink: 0
        }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${redPct}%`, background: '#dc2626',
                transition: 'height 0.5s ease'
            }} />
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                writingMode: 'vertical-rl', textOrientation: 'mixed', zIndex: 2
            }}>
                {Math.abs(normalizedScore) >= 900 ? 'M' : (normalizedScore > 0 ? '+' : '') + (normalizedScore / 100).toFixed(1)}
            </div>
        </div>
    );
}

export default function XiangqiGame() {
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

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
            overflow: 'hidden', padding: '1rem', boxSizing: 'border-box'
        }}>
            <div style={{
                position: 'relative', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
                padding: '1.5rem', gap: '1rem', alignItems: 'stretch', justifyContent: 'center',
                height: '100%', maxHeight: '850px', width: '100%', maxWidth: '1200px',
                borderRadius: '24px', background: 'rgba(23,23,33,0.85)', backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
                boxSizing: 'border-box'
            }}>
                {/* LEFT CONTROL PANEL */}
                <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#fca5a5', letterSpacing: '2px' }}>CỜ TƯỚNG</h1>
                        <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 800 }}>TRẬN BÀN GỖ</div>
                    </div>

                    <button onClick={() => navigate('/xiangqi')} style={{
                        padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.9rem'
                    }}>
                        <ArrowLeft size={16} /> THOÁT
                    </button>

                    {/* Player Info */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 800, marginBottom: '12px', letterSpacing: '1px' }}>THÔNG TIN TRẬN</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>帥</div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Phe Đỏ (Tiên)</div>
                                <div style={{ fontWeight: 'bold', color: '#fca5a5', fontSize: '0.85rem' }}>{myColor === 'r' ? 'Bạn' : 'Máy (CPU)'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1e293b', border: '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 'bold' }}>將</div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#888' }}>Phe Đen (Hậu)</div>
                                <div style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '0.85rem' }}>{myColor === 'b' ? 'Bạn' : 'Máy (CPU)'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={handleUndo} disabled={isGameOver || moveList.length === 0} style={{
                            padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            color: moveList.length > 0 ? '#fbbf24' : '#555', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: moveList.length > 0 ? 'pointer' : 'default', fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}>
                            <Undo2 size={16} /> HOÀN TÁC
                        </button>
                        <button onClick={handleHint} disabled={isGameOver || turn !== myColor} style={{
                            padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            color: (turn === myColor && !isGameOver) ? '#4ade80' : '#555',
                            border: '1px solid rgba(255,255,255,0.08)',
                            cursor: (turn === myColor && !isGameOver) ? 'pointer' : 'default', fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}>
                            <Lightbulb size={16} /> GỢI Ý
                        </button>
                    </div>
                </div>

                {/* EVAL BAR + CENTER BOARD */}
                <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, minHeight: 0, gap: '8px' }}>
                    <EvalBar score={evalScore} myColor={myColor} />

                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 'min(90vw, 650px)',
                        aspectRatio: '9/10',
                        boxSizing: 'border-box',
                        backgroundColor: '#e6c28f',
                        border: '10px solid #8b5a2b',
                        borderRadius: '4px',
                        boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 40px rgba(139,90,43,0.5)',
                        overflow: 'hidden',
                        alignSelf: 'center'
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
                                                            width: '8.5%', aspectRatio: '1', transform: 'translate(-50%, -50%)',
                                                            backgroundColor: isHintFrom ? '#4ade80' : isHintTo ? '#4ade80' : '#e6c28f',
                                                            borderRadius: '50%',
                                                            border: `2px solid ${isSelected ? '#fbbf24' : isHintFrom || isHintTo ? '#4ade80' : isKingInCheck ? '#ef4444' : '#8b5a2b'}`,
                                                            boxShadow: isSelected
                                                                ? '0 0 20px #fbbf24, inset 0 0 10px rgba(0,0,0,0.5)'
                                                                : isHintFrom || isHintTo
                                                                    ? '0 0 20px rgba(74,222,128,0.8), inset 0 0 10px rgba(74,222,128,0.3)'
                                                                    : isKingInCheck
                                                                        ? '0 0 20px rgba(239,68,68,0.9), inset 0 0 15px rgba(239,68,68,0.6)'
                                                                        : '0 4px 10px rgba(0,0,0,0.6), inset 0 0 10px rgba(139,90,43,0.8)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 'min(28px, 3.5vw)', fontWeight: 900,
                                                            fontFamily: '"KaiTi", "Kaiti SC", "STKaiti", serif',
                                                            color: PIECE_COLORS[piece[0]],
                                                            textShadow: '0 1px 2px rgba(255,255,255,0.5)',
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
                                        {winner === myColor ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}
                                    </h2>
                                    <p style={{ color: '#aaa' }}>{winner === 'r' ? 'Phe Đỏ (Tiên) thắng!' : 'Phe Đen (Hậu) thắng!'}</p>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                            <RotateCcw size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> CHƠI LẠI
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

                {/* RIGHT PANEL - Status + History */}
                <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Turn Status */}
                    <div style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.1), transparent)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 800, marginBottom: '12px', letterSpacing: '1px' }}>
                            Trạng thái
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '6px' }}>Lượt đánh:</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: turn === 'r' ? '#ef4444' : '#94a3b8' }}>
                                {turn === 'r' ? 'ĐỎ' : 'ĐEN'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: isThinking ? '#fbbf24' : '#666', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {isThinking && <Activity size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                                {turn === myColor ? '(Lượt bạn)' : '(CPU suy nghĩ...)'}
                            </div>
                        </div>
                        {inCheckColor && (
                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>
                                CHIẾU!
                            </div>
                        )}
                    </div>

                    {/* Eval */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 800, marginBottom: '8px', letterSpacing: '1px' }}>ĐÁNH GIÁ</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                flex: 1, height: '8px', borderRadius: '4px', background: '#1e293b', overflow: 'hidden', position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                    width: `${Math.max(5, Math.min(95, 50 + (evalScore / 20)))}%`,
                                    background: evalScore > 0 ? '#dc2626' : evalScore < 0 ? '#475569' : '#fbbf24',
                                    transition: 'width 0.5s ease, background 0.3s',
                                    borderRadius: '4px'
                                }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: evalScore > 0 ? '#ef4444' : evalScore < 0 ? '#94a3b8' : '#fbbf24', minWidth: '40px', textAlign: 'right' }}>
                                {(evalScore / 100).toFixed(1)}
                            </span>
                        </div>
                    </div>

                    {/* Move History */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={14} color="#888" />
                                <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 800, letterSpacing: '1px' }}>NƯỚC ĐI ({moveList.length})</span>
                            </div>
                            {showHistory ? <ChevronDown size={14} color="#888" /> : <ChevronRight size={14} color="#888" />}
                        </div>
                        {showHistory && (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', maxHeight: '300px' }}>
                                {moveList.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center', margin: '8px 0' }}>Chưa có nước đi</p>
                                ) : (
                                    moveList.map((m, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '4px 6px', borderRadius: '6px',
                                            background: i === moveList.length - 1 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            fontSize: '0.75rem', color: m.color === 'r' ? '#fca5a5' : '#94a3b8',
                                            fontFamily: 'monospace'
                                        }}>
                                            <span style={{ color: '#555', minWidth: '20px' }}>{i + 1}.</span>
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
            `}</style>
        </div>
    );
}
