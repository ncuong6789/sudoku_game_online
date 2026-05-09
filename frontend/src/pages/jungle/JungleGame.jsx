import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJungleLogic } from './useJungleLogic';
import { useJungleSounds } from './useJungleSounds';
import { Swords, Trophy, Activity, ArrowLeft, RotateCcw, RefreshCw, HelpCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';
import { useTranslation } from 'react-i18next';

const MAP_WIDTH = 7;
const MAP_HEIGHT = 9;
const TILE_SIZE = 70;
const MAP_SIZE_W = MAP_WIDTH * TILE_SIZE;
const MAP_SIZE_H = MAP_HEIGHT * TILE_SIZE;

const PIECE_NAMES = {
    1: 'Chuột', 2: 'Mèo', 3: 'Chó', 4: 'Sói', 5: 'Báo', 6: 'Hổ', 7: 'Sư tử', 8: 'Voi'
};

const PIECE_DESCRIPTIONS = {
    1: 'Bơi được trong sông, ăn được Voi',
    2: 'Di chuyển bình thường',
    3: 'Di chuyển bình thường',
    4: 'Di chuyển bình thường',
    5: 'Di chuyển bình thường',
    6: 'Nhảy qua sông, bị Chuột ăn trong sông',
    7: 'Nhảy qua sông, bị Chuột ăn trong sông',
    8: 'Bị Chuột ăn, không vào được sông'
};

const RIVERS = [
    { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
];

const TRAPS = [
    { x: 2, y: 0, owner: 0 }, { x: 4, y: 0, owner: 0 }, { x: 3, y: 1, owner: 0 },
    { x: 2, y: 8, owner: 1 }, { x: 4, y: 8, owner: 1 }, { x: 3, y: 7, owner: 1 }
];

const DENS = [
    { x: 3, y: 0, owner: 0 },
    { x: 3, y: 8, owner: 1 }
];

const ANIMAL_ICONS = {
    1: '⚀', 2: '⚂', 3: '⚃', 4: '⚄', 5: '⚅', 6: '⚌', 7: '⚘', 8: '▣'
};

const ANIMAL_COLORS = {
    1: '#9ca3af', 2: '#f97316', 3: '#a855f7', 4: '#ef4444', 5: '#eab308', 6: '#f59e0b', 7: '#eab308', 8: '#64748b'
};

const ANIMAL_SYMBOLS = {
    1: { char: '🐭', name: 'Rat', sound: 'squeak' },
    2: { char: '🐱', name: 'Cat', sound: 'meow' },
    3: { char: '🐶', name: 'Dog', sound: 'bark' },
    4: { char: '🐺', name: 'Wolf', sound: 'howl' },
    5: { char: '🐆', name: 'Leopard', sound: 'growl' },
    6: { char: '🐯', name: 'Tiger', sound: 'roar' },
    7: { char: '🦁', name: 'Lion', sound: 'roar' },
    8: { char: '🐘', name: 'Elephant', sound: 'trumpet' }
};

export default function JungleGame() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode, difficulty } = location.state || { roomId: 'local', mode: 'solo', difficulty: 'medium' };
    
    const [hintMoves, setHintMoves] = useState(null);
    
    const { playSelect, playMove, playCapture, playWin, playLose } = useJungleSounds();

    const { pieces, turn, selectedPiece, validMoves, gameOver, isLoading, handleSelect, myId } = useJungleLogic(
        roomId, mode, difficulty, 
        () => {}, // No auto-hint on move
        (isJump) => playMove(isJump),
        (capturedPiece, attackerPiece) => playCapture(capturedPiece?.type, attackerPiece?.type),
        (winner) => {
            if (winner === myId) playWin();
            else playLose();
        }
    );

    const getHint = () => {
        socket.emit(EVENTS.JUNGLE_GET_HINT, { roomId });
    };

    // Listen for hint response
    useEffect(() => {
        const handleHintResponse = (suggestions) => {
            setHintMoves(suggestions);
        };
        socket.on('jungleHintReceived', handleHintResponse);
        return () => socket.off('jungleHintReceived', handleHintResponse);
    }, []);

    const handleReset = () => {
        const resetRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        socket.emit(EVENTS.START_JUNGLE_GAME, { roomId: resetRoomId, mode, difficulty });
    };

    // Coordinate converters
    const getRenderX = (x) => myId === 1 ? 6 - x : x;
    const getRenderY = (y) => myId === 1 ? y : 8 - y;
    
    const handleSquareClick = (x, y) => {
        const piece = pieces.find(p => p.x === x && p.y === y);
        if (piece && piece.ownerId === myId) {
            handleSelect(x, y, playSelect);
        } else {
            handleSelect(x, y);
        }
    };


    const isMyTurn = turn === myId;

    const [zoomLevel, setZoomLevel] = useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    return (
        <div className="jungle-main-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', overflow: 'hidden', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                
                {/* LEFT PANEL: INFO & RULES */}
                <div className="jungle-left-panel" style={{
                    flex: '0 0 260px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    background: 'rgba(15,23,42,0.6)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    padding: '1.5rem',
                    boxSizing: 'border-box'
                }}>
                    <h3 className="gp-title" style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <span>📊</span> {t('jungle.rankSkill')}
                    </h3>

                    <div className="gp-card" style={{
                        flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px',
                        display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                        {[8,7,6,5,4,3,2,1].map(v => (
                            <div key={v} style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: v <= 2 ? 'rgba(251,191,36,0.08)' : (v >= 7 ? 'rgba(239,68,68,0.08)' : 'transparent'),
                                padding: '6px', borderRadius: '6px'
                            }}>
                                <div style={{ 
                                    width: '28px', height: '28px', borderRadius: '6px', 
                                    background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {ANIMAL_SYMBOLS[v]?.char || v}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="gp-ui" style={{ color: '#fff', fontWeight: 600 }}>{PIECE_NAMES[v]}</span>
                                        {v === 8 && <span className="gp-micro" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Yếu với 🐭</span>}
                                        {v === 1 && <span className="gp-micro" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Ăn được 🐘</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <div className="gp-label" style={{ color: '#fbbf24', marginBottom: '6px' }}>🎯 {t('jungle.rules')}</div>
                            <ul className="gp-caption" style={{ margin: 0, paddingLeft: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                                <li>{t('jungle.bigEatSmall')} (8 vs 1)</li>
                                <li>Lion/Tiger <span style={{color:'#4ade80'}}>{t('jungle.jumpRiver')}</span></li>
                                <li>Rat <span style={{color:'#4ade80'}}>{t('jungle.swim')}</span> & eat Elephant</li>
                                <li>{t('jungle.enterDen')}</li>
                            </ul>
                        </div>
                        
                        <div style={{ padding: '8px', background: 'rgba(96,165,250,0.1)', borderRadius: '6px', border: '1px solid rgba(96,165,250,0.2)' }}>
                            <div className="gp-label" style={{ color: '#60b5ff' }}>{t('jungle.terrain')}</div>
                            <div className="gp-micro" style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                                🌊 River | ⬜ Trap | 🏠 Den
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Zoom */}
                    <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="gp-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '8px 10px' }}>
                            <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomOut size={16} />
                            </button>
                            <span className="gp-ui" style={{ minWidth: '38px', textAlign: 'center', userSelect: 'none' }}>
                                {zoomLevel}%
                            </span>
                            <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                <ZoomIn size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CENTER: BOARD */}
                <div className="jungle-board-area" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: '320px', padding: '1rem', overflow: 'auto', position: 'relative' }}>


                    <div style={{
                        position: 'relative',
                        border: '8px solid rgba(15, 15, 25, 0.95)',
                        borderRadius: '12px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        background: '#0f172a',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`,
                        gridTemplateRows: `repeat(${MAP_HEIGHT}, 1fr)`,
                        width: zoomLevel > 100 ? `${520 * (zoomLevel/100)}px` : 'min(75vw, 520px)',
                        aspectRatio: '7 / 9'
                    }}>
                        {isLoading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, background: 'rgba(15, 23, 42, 0.9)' }}>
                                <RefreshCw className="animate-spin" size={48} color="#4ade80" style={{ marginBottom: '15px' }} />
                                <span className="gp-ui" style={{ color: '#94a3b8' }}>{t('jungle.connecting')}</span>
                            </div>
                        )}
                        
                        {/* Board Tiles */}
                        {Array.from({ length: MAP_HEIGHT }).map((_, renderY) => 
                            Array.from({ length: MAP_WIDTH }).map((_, renderX) => {
                                const x = myId === 1 ? 6 - renderX : renderX;
                                const y = myId === 1 ? renderY : 8 - renderY;
                                
                                const isRiver = RIVERS.some(r => r.x === x && r.y === y);
                                const trap = TRAPS.find(t => t.x === x && t.y === y);
                                const den = DENS.find(d => d.x === x && d.y === y);
                                const isValidMove = validMoves.some(m => m.x === x && m.y === y);
                                
                                let bg = 'rgba(34, 197, 94, 0.03)';
                                if (isRiver) bg = 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.4) 100%)';
                                if (trap) bg = 'rgba(220, 38, 38, 0.08)';
                                if (den) bg = den.owner === 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.1)';
                                
                                return (
                                    <div key={`${x}-${y}`} onClick={() => handleSquareClick(x, y)} style={{
                                        position: 'relative', border: '1px solid rgba(255,255,255,0.03)', background: bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isMyTurn ? 'pointer' : 'default'
                                    }}>
                                        {isRiver && <div className="jungle-river-wave" />}
                                        {trap && (
                                            <div style={{ position: 'absolute', inset: '4px', border: '2px dashed rgba(248, 113, 113, 0.5)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'min(3vh, 3vw)', color: 'rgba(248, 113, 113, 0.7)' }}>💀</div>
                                        )}
                                        {den && (
                                            <div style={{ position: 'absolute', inset: '6px', border: `2px solid ${den.owner !== 0 ? '#4ade80' : '#fff'}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'min(3vh, 3vw)', color: den.owner !== 0 ? '#4ade80' : '#fff' }}>🏠</div>
                                        )}
                                        {isValidMove && <div style={{ width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.8)', boxShadow: '0 0 10px #4ade80', zIndex: 10, animation: 'pulse 1.5s infinite' }} />}
                                    </div>
                                );
                            })
                        )}

                        {/* Pieces Overlay */}
                        {pieces.map(p => {
                            const renderX = myId === 1 ? 6 - p.x : p.x;
                            const renderY = myId === 1 ? p.y : 8 - p.y;
                            const isSelected = selectedPiece && selectedPiece.x === p.x && selectedPiece.y === p.y;
                            const isMyPiece = p.ownerId === myId;
                            
                            return (
                                <div key={p.id} onClick={(e) => { e.stopPropagation(); handleSquareClick(p.x, p.y); }} style={{
                                    position: 'absolute', left: `${(renderX / MAP_WIDTH) * 100}%`, top: `${(renderY / MAP_HEIGHT) * 100}%`, width: `${100 / MAP_WIDTH}%`, height: `${100 / MAP_HEIGHT}%`,
                                    transition: 'left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, cursor: isMyPiece && isMyTurn ? 'pointer' : 'default',
                                    pointerEvents: 'auto'
                                }}>
                                    <div style={{
                                        width: '85%', height: '85%', borderRadius: '50%',
                                        background: isMyPiece ? 'linear-gradient(135deg, #22c55e 0%, #166534 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                                        border: `2px solid ${isSelected ? '#fff' : (isMyPiece ? '#4ade80' : '#60a5fa')}`,
                                        boxShadow: isSelected ? `0 0 20px ${isMyPiece ? '#4ade80' : '#60a5fa'}, inset 0 0 10px rgba(255,255,255,0.3)` : '0 4px 10px rgba(0,0,0,0.6), inset 0 0 5px rgba(255,255,255,0.2)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative', transform: isSelected ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s', backdropFilter: 'blur(4px)'
                                    }}>
                                        <span style={{ fontSize: 'min(4vh, 4.5vw)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', marginTop: '-2px' }}>{ANIMAL_SYMBOLS[p.type]?.char}</span>
                                        <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'rgba(15,23,42,0.9)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isMyPiece ? '#4ade80' : '#60a5fa'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{p.type}</div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Hint SVG Overlay */}
                        {hintMoves && hintMoves.length > 0 && (() => {
                            const bestMove = hintMoves[0];
                            const fromR_X = myId === 1 ? 6 - bestMove.from.x : bestMove.from.x;
                            const fromR_Y = myId === 1 ? bestMove.from.y : 8 - bestMove.from.y;
                            const toR_X = myId === 1 ? 6 - bestMove.to.x : bestMove.to.x;
                            const toR_Y = myId === 1 ? bestMove.to.y : 8 - bestMove.to.y;
                            
                            const fx = (fromR_X + 0.5) * (100 / MAP_WIDTH);
                            const fy = (fromR_Y + 0.5) * (100 / MAP_HEIGHT);
                            const tx = (toR_X + 0.5) * (100 / MAP_WIDTH);
                            const ty = (toR_Y + 0.5) * (100 / MAP_HEIGHT);

                            return (
                                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
                                        </marker>
                                    </defs>
                                    <line x1={`${fx}%`} y1={`${fy}%`} x2={`${tx}%`} y2={`${ty}%`} stroke="#fbbf24" strokeWidth="4" strokeDasharray="10 5" markerEnd="url(#arrowhead)" style={{ animation: 'dash 1s linear infinite' }} />
                                </svg>
                            );
                        })()}
                    </div>
                </div>

                {/* RIGHT: CONTROLS */}
                <div className="jungle-right-panel" style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.8rem', overflowY: 'auto', padding: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                        <div className="gp-card" style={{ padding: '16px 12px' }}>
                            <div className="gp-label" style={{ textAlign: 'center', marginBottom: '16px' }}>THÔNG TIN TRẬN ĐẤU</div>
                            
                            {/* Blue/Green Player (My Side) */}
                            <div className="gp-player-row" style={{ 
                                background: turn === myId ? 'rgba(74,222,128,0.1)' : 'transparent',
                                border: turn === myId ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🦁</div>
                                <div style={{ flex: 1 }}>
                                    <div className="role">{t('jungle.greenSide', 'Phe Xanh')}</div>
                                    <div className="name" style={{ color: '#4ade80' }}>{t('jungle.you', 'Bạn')}</div>
                                </div>
                                {turn === myId && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />}
                            </div>

                            <div style={{ width: '2px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '4px auto' }} />

                            {/* Opponent Player */}
                            <div className="gp-player-row" style={{ 
                                background: turn !== myId ? 'rgba(96,165,250,0.1)' : 'transparent',
                                border: turn !== myId ? '1px solid rgba(96,165,250,0.3)' : '1px solid transparent'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🐯</div>
                                <div style={{ flex: 1 }}>
                                    <div className="role">{t('jungle.blueSide', 'Phe Đỏ')}</div>
                                    <div className="name" style={{ color: '#94a3b8' }}>{mode === 'multiplayer' ? 'Đối thủ' : 'CPU'}</div>
                                </div>
                                {turn !== myId && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} />}
                            </div>
                            
                            <div className="gp-caption" style={{ textAlign: 'center', marginTop: '16px', color: '#fbbf24', fontWeight: 600 }}>
                                {turn === myId ? 'Tới lượt của bạn' : 'Đang suy nghĩ...'}
                            </div>
                        </div>

                        {hintMoves && hintMoves.length > 0 && (
                            <div className="gp-card" style={{ padding: '8px' }}>
                                <div className="gp-label" style={{ color: '#fbbf24' }}>GỢI Ý NƯỚC ĐI:</div>
                                {hintMoves.slice(0, 3).map((move, idx) => {
                                    const pct = move.percentage || 0;
                                    let color;
                                    if (pct >= 80) color = '#4ade80';
                                    else if (pct >= 50) color = '#60b5fa';
                                    else if (pct >= 20) color = '#fbbf24';
                                    else color = '#ef4444';
                                    return (
                                        <div key={idx} className="gp-caption" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '4px', borderRadius: '4px' }}>
                                            <span style={{ color }}>{ANIMAL_SYMBOLS[pieces.find(p => p.x === move.from.x && p.y === move.from.y)?.type]?.char || '?'} {String.fromCharCode(65 + move.from.x)}{9 - move.from.y} → {String.fromCharCode(65 + move.to.x)}{9 - move.to.y}</span>
                                        </div>
                                    )
                                })}
                                <button className="gp-btn" onClick={() => setHintMoves(null)} style={{ width: '100%', padding: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>✕ Ẩn</button>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="gp-btn gp-btn-primary" onClick={handleReset} style={{ color: '#000' }}>
                                <RotateCcw size={16} /> {t('jungle.restart', 'Chơi lại')}
                            </button>
                            <button className="gp-btn" onClick={getHint} disabled={turn !== myId || isLoading} style={{ color: (turn === myId && !isLoading) ? '#4ade80' : '' }}>
                                <HelpCircle size={16} /> {t('jungle.hint', 'Gợi ý')}
                            </button>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <button className="gp-btn" onClick={() => navigate('/jungle')} style={{ padding: '12px' }}>
                            <ArrowLeft size={16} /> {t('common.exit', 'Thoát')}
                        </button>
                    </div>
                </div>

                {/* GAME OVER OVERLAY */}
                {gameOver !== null && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                        <div className="gp-card" style={{ padding: '40px 50px', border: `1px solid ${gameOver === myId ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, boxShadow: gameOver === myId ? '0 0 40px rgba(251,191,36,0.3)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <Trophy size={60} color={gameOver === myId ? '#fbbf24' : '#94a3b8'} />
                            <div className="gp-title" style={{ fontSize: '1.8rem', fontWeight: 900, color: gameOver === myId ? '#fbbf24' : '#fff', margin: 0 }}>
                                {gameOver === myId ? t('jungle.victory') : t('jungle.defeat')}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button className="gp-btn gp-btn-primary" onClick={handleReset} style={{ background: gameOver === myId ? '#fbbf24' : '#ef4444', color: '#000', padding: '10px 24px', width: 'auto' }}>
                                    CHƠI LẠI
                                </button>
                                <button className="gp-btn" onClick={() => navigate('/jungle')} style={{ padding: '10px 24px', width: 'auto' }}>
                                    THOÁT
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 850px) {
                    .jungle-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .jungle-left-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                    }
                    .jungle-board-area {
                        flex: 0 0 auto !important;
                        padding: 0.5rem !important;
                    }
                    .jungle-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-left: none !important;
                        border-top: 1px solid rgba(255,255,255,0.06) !important;
                        padding: 0.5rem !important;
                    }
                }
                @keyframes dash {
                    to { stroke-dashoffset: -30; }
                }
                .jungle-river-wave {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
                    background-size: 100% 200%;
                    animation: waveflow 3s linear infinite;
                    pointer-events: none;
                }
                @keyframes waveflow {
                    0% { background-position: 0% 100%; }
                    100% { background-position: 0% 0%; }
                }
            `}</style>
        </div>
    );
}
