import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Undo2, Lightbulb, History, ChevronRight, ChevronDown, Activity, Crown, ZoomIn, ZoomOut } from 'lucide-react';
import { useChessLogic } from './useChessLogic';
import { useAudio } from '../../utils/useAudio';
import { useTranslation } from 'react-i18next';

function EvalBar({ score, myColor }) {
    const normalizedScore = Math.max(-2000, Math.min(2000, score));
    const whitePct = myColor === 'w'
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
                height: `${whitePct}%`, background: '#f8fafc',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '-4px', right: '-4px', height: '2px', background: 'rgba(255,255,255,0.3)', zIndex: 2 }} />
            <div style={{
                position: 'absolute', [whitePct > 50 ? 'bottom' : 'top']: '10px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.6rem', fontWeight: 800, color: whitePct > 50 ? '#0f172a' : '#f8fafc',
                zIndex: 3, writingMode: 'vertical-rl'
            }}>
                {Math.abs(normalizedScore) >= 900 ? 'M' : (Math.abs(normalizedScore) / 100).toFixed(1)}
            </div>
        </div>
    );
}

export default function ChessGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, playerColor } = location.state || { mode: 'solo', difficulty: 'Medium', playerColor: 'w' };

    const {
        playChessMoveSound, playChessCaptureSound, playChessCheckSound,
        playChessIllegalSound, playWinSound, playLoseSound
    } = useAudio();

    const [realPlayerColor] = useState(() => {
        if (playerColor === 'random') return Math.random() < 0.5 ? 'w' : 'b';
        return playerColor;
    });

    const myColor = realPlayerColor || 'w';

    const {
        game, turn, isGameOver, winner, selectedSquare, validMoves, moveHistory,
        evalScore, hintMove, hintSuggestions, isThinkingHint,
        selectSquare, movePiece, makeAIMove, undoMove, getHint, resetGame,
        setHintMove, setHintSuggestions
    } = useChessLogic(mode, roomId, difficulty, myColor, {
        onClick: playChessMoveSound,
        onMove: playChessMoveSound,
        onCapture: playChessCaptureSound,
        onCheck: playChessCheckSound,
        onIllegal: playChessIllegalSound, // you'd map this inside if needed
        myColor
    });

    const [showHistory, setShowHistory] = useState(false);
    const isThinking = mode === 'solo' && !isGameOver && turn !== myColor;

    useEffect(() => {
        if (mode === 'solo' && !isGameOver && turn !== myColor) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 150);
            return () => { clearTimeout(timer); };
        }
    }, [turn, mode, isGameOver, myColor, makeAIMove]);

    useEffect(() => {
        if (isGameOver && winner) {
            if (winner === myColor) playWinSound();
            else if (winner !== 'draw') playLoseSound();
        }
    }, [isGameOver, winner, myColor, playWinSound, playLoseSound]);

    const handleSquareClick = (sq) => {
        if (isGameOver || turn !== myColor) return;
        if (selectedSquare && validMoves.includes(sq)) {
            movePiece(sq);
        } else {
            selectSquare(sq);
        }
    };

    const beautifulUnicode = {
        'w': { 'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔' },
        'b': { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' }
    };

    const [zoomLevel, setZoomLevel] = useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    return (
        <div className="chess-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                {/* LEFT CONTROL PANEL */}
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
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '1px' }}>CỜ VUA</h2>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>GIAO DIỆN CHUẨN</div>
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
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/chess')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <ArrowLeft size={16} /> Thoát khỏi phòng
                        </button>
                    </div>
                </div>

                {/* EVAL BAR + CENTER BOARD */}
                <div className="chess-board-area" style={{
                    flex: '1 1 auto', display: 'flex', justifyContent: 'center',
                    minWidth: 0, minHeight: 0, gap: '12px', padding: '1rem',
                    overflow: 'auto', alignItems: 'center', position: 'relative'
                }}>
                    
                    {/* Zoom Controls */}
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15,23,42,0.8)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 110, backdropFilter: 'blur(8px)' }}>
                        <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                            <ZoomOut size={18} />
                        </button>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, minWidth: '45px', textAlign: 'center', userSelect: 'none' }}>
                            {zoomLevel}%
                        </span>
                        <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', height: zoomLevel > 100 ? `${600 * (zoomLevel/100)}px` : 'min(80vw - 70px, 85vh)' }}>
                        <EvalBar score={evalScore} myColor={myColor} />

                        <div className="chess-board-container" style={{
                            position: 'relative',
                            height: '100%',
                            aspectRatio: '1',
                            boxSizing: 'border-box',
                            backgroundColor: '#5f8099',
                            border: '8px solid rgba(15, 15, 25, 0.95)',
                            borderRadius: '6px',
                            boxShadow: '0 0 30px rgba(0,0,0,0.6)',
                            overflow: 'hidden',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, 1fr)',
                            gridTemplateRows: 'repeat(8, 1fr)'
                        }}>
                        {(() => {
                            const ranksArr = [8, 7, 6, 5, 4, 3, 2, 1];
                            const filesArr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                            const isFlipped = myColor === 'b';
                            const displayRanks = isFlipped ? [...ranksArr].reverse() : ranksArr;
                            const displayFiles = isFlipped ? [...filesArr].reverse() : filesArr;
                            
                            const squares = [];
                            for (let i = 0; i < 8; i++) {
                                for (let j = 0; j < 8; j++) {
                                    const r = displayRanks[i];
                                    const f = displayFiles[j];
                                    const sq = f + r;
                                    const isLight = (r + filesArr.indexOf(f)) % 2 !== 0;
                                    const bgColor = isLight ? '#d1dee6' : '#5f8099';
                                    
                                    const piece = game.get(sq);
                                    let finalBg = bgColor;
                                    
                                    const isSelected = selectedSquare === sq;
                                    const isValidMove = validMoves.includes(sq);
                                    const isLastMoveFrom = moveHistory.length > 0 && moveHistory[moveHistory.length - 1].from === sq;
                                    const isLastMoveTo = moveHistory.length > 0 && moveHistory[moveHistory.length - 1].to === sq;
                                    const isHintFrom = hintMove?.from === sq;
                                    const isHintTo = hintMove?.to === sq;
                                    
                                    if (isSelected) finalBg = 'rgba(79, 172, 254, 0.5)';
                                    else if (isLastMoveFrom || isLastMoveTo) finalBg = 'rgba(255, 235, 59, 0.4)';
                                    else if (isHintFrom || isHintTo) finalBg = 'rgba(251, 191, 36, 0.3)';
                                    
                                    const inCheckMatch = game.isCheck() && piece?.type === 'k' && piece?.color === game.turn();
                                    if (inCheckMatch) finalBg = 'rgba(239, 68, 68, 0.8)';

                                    squares.push(
                                        <div key={sq} onClick={() => handleSquareClick(sq)}
                                            style={{
                                                backgroundColor: finalBg, position: 'relative', display: 'flex',
                                                justifyContent: 'center', alignItems: 'center',
                                                cursor: (turn === myColor || isValidMove) ? 'pointer' : 'default',
                                                border: isHintTo || isHintFrom ? '4px solid #fbbf24' : 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {isValidMove && !piece && (
                                                <div style={{ width: '25%', height: '25%', background: 'rgba(74, 222, 128, 0.6)', borderRadius: '50%' }} />
                                            )}
                                            {isValidMove && piece && (
                                                <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(239, 68, 68, 0.8)', borderRadius: '50%' }} />
                                            )}
                                            {piece && (
                                                <span style={{
                                                    fontSize: 'min(7vh, 7vw)', lineHeight: 1, 
                                                    color: piece.color === 'w' ? '#fff' : '#1e1e1e',
                                                    textShadow: piece.color === 'w' ? '0px 2px 5px rgba(0,0,0,0.8)' : '0px 2px 2px rgba(255,255,255,0.3)',
                                                    position: 'relative', zIndex: 2, pointerEvents: 'none',
                                                    transition: 'transform 0.1s ease',
                                                    transform: isValidMove ? 'scale(1.1)' : 'scale(1)'
                                                }}>
                                                    {beautifulUnicode[piece.color][piece.type]}
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                            }
                            return squares;
                        })()}
                    </div>
                    </div>

                    {/* Hint Suggestions Overlay directly mapped near board */}
                    {hintSuggestions && hintSuggestions.length > 0 && (
                        <div style={{ 
                            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                            padding: '12px', background: 'rgba(30,30,40,0.95)', borderRadius: '12px', 
                            border: '1px solid rgba(251,191,36,0.5)', animation: 'fadeIn 0.3s ease', zIndex: 50,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>💡</span> Gợi ý nước đi tốt nhất
                            </div>
                            {hintSuggestions.map((m, idx) => (
                                <div key={idx} onClick={() => setHintMove(m)} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 12px', marginBottom: '6px', cursor: 'pointer', gap: '16px',
                                    background: idx === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px', border: `1px solid ${m.color || 'rgba(255,255,255,0.05)'}`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ 
                                            width: '20px', height: '20px', borderRadius: '50%', 
                                            background: m.color || '#94a3b8', display: 'flex', alignItems: 'center', 
                                            justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: idx < 2 ? '#000' : '#fff'
                                        }}>{idx + 1}</span>
                                        <span style={{ color: '#fff', fontSize: '0.85rem' }}>{m.from} → {m.to}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                        <span style={{ color: m.color, fontWeight: 600, fontSize: '0.75rem' }}>{m.label}</span>
                                        <span style={{ fontSize: '0.65rem', color: m.color }}>{m.evalDisplay}</span>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => { setHintSuggestions(null); setHintMove(null); }} style={{ 
                                width: '100%', padding: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', cursor: 'pointer', marginTop: '4px'
                            }}>✕ Ẩn gợi ý</button>
                        </div>
                    )}

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
                </div>

                {/* RIGHT PANEL - Status + History */}
                <div className="chess-right-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: '0.8rem', overflowY: 'auto', padding: '1.5rem',
                    borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    {/* Turn Status */}
                    <div style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.08), transparent)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(234,179,8,0.15)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800, marginBottom: '8px', letterSpacing: '1px' }}>
                            TRẠNG THÁI
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '4px' }}>Lượt:</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: turn === 'w' ? '#f8fafc' : '#94a3b8' }}>
                                {turn === 'w' ? 'TRẮNG' : 'ĐEN'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isThinking ? '#fbbf24' : '#666', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {isThinking && <Activity size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
                                {turn === myColor ? 'Bạn' : 'CPU...'}
                            </div>
                        </div>
                        {game.isCheck() && (
                            <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                CHIẾU!
                            </div>
                        )}
                    </div>

                    {/* Eval */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '6px', letterSpacing: '1px' }}>ĐÁNH GIÁ (TRẮNG)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                flex: 1, height: '6px', borderRadius: '3px', background: '#1e293b', overflow: 'hidden', position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                    width: `${Math.max(3, Math.min(97, 50 + (evalScore / 25)))}%`, // Maps ~1200cp to edge
                                    background: evalScore > 0 ? '#f8fafc' : evalScore < 0 ? '#475569' : '#fbbf24',
                                    transition: 'width 0.4s ease, background 0.3s',
                                    borderRadius: '3px'
                                }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: evalScore > 0 ? '#f8fafc' : evalScore < 0 ? '#94a3b8' : '#fbbf24', minWidth: '32px', textAlign: 'right' }}>
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
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                @media (max-width: 850px) {
                    .chess-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .chess-left-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        max-height: none !important;
                    }
                    .chess-board-area {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        padding: 0.5rem !important;
                    }
                    .chess-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-left: none !important;
                        border-top: 1px solid rgba(255,255,255,0.06) !important;
                        padding: 0.5rem !important;
                    }
                    .chess-top-bar {
                        padding: 8px 12px !important;
                    }
                    .chess-top-bar h1 {
                        font-size: 1rem !important;
                    }
                }

                @media (max-width: 480px) {
                    .chess-left-panel {
                        padding: 0.5rem !important;
                    }
                    .chess-player-avatars {
                        gap: 6px !important;
                    }
                    .chess-avatar {
                        width: 24px !important;
                        height: 24px !important;
                        font-size: 1.2rem !important;
                    }
                    .chess-board-container {
                        border-width: 4px !important;
                    }
                }
            `}</style>
        </div>
    );
}
