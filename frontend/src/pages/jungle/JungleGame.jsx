import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJungleLogic } from './useJungleLogic';
import { Swords, Trophy, Activity, ArrowLeft, RotateCcw, RefreshCw, HelpCircle } from 'lucide-react';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';

const MAP_WIDTH = 7;
const MAP_HEIGHT = 9;
const TILE_SIZE = 70;
const MAP_SIZE_W = MAP_WIDTH * TILE_SIZE;
const MAP_SIZE_H = MAP_HEIGHT * TILE_SIZE;

const PIECE_NAMES = {
    1: 'Chuột', 2: 'Mèo', 3: 'Chó', 4: 'Sói', 5: 'Báo', 6: 'Hổ', 7: 'Sư tử', 8: 'Voi'
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

export default function JungleGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode, difficulty } = location.state || { roomId: 'local', mode: 'solo', difficulty: 'medium' };
    
    const canvasRef = useRef(null);
    const [activeHint, setActiveHint] = useState(null);
    
    const { pieces, turn, selectedPiece, validMoves, gameOver, handleSelect, myId } = useJungleLogic(
        roomId, mode, difficulty, (move) => {
            setActiveHint(move);
            setTimeout(() => setActiveHint(null), 3000); // Auto clear hint
        }
    );

    const getHint = () => {
        socket.emit(EVENTS.JUNGLE_GET_HINT, { roomId });
    };

    const handleReset = () => {
        const resetRoomId = roomId === 'local' ? `local_${socket.id}` : roomId;
        socket.emit(EVENTS.START_JUNGLE_GAME, { roomId: resetRoomId, mode, difficulty });
    };

    // Coordinate converters
    const getRenderX = (x) => myId === 1 ? 6 - x : x;
    const getRenderY = (y) => myId === 1 ? y : 8 - y;
    
    // Drawing Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let frameId;

        const render = (ts) => {
            // 1. Clear & Background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, MAP_SIZE_W, MAP_SIZE_H);

            // 2. Draw Grid & Special Tiles
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    const tx = getRenderX(x) * TILE_SIZE;
                    const ty = getRenderY(y) * TILE_SIZE;

                    // Base Tile
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);

                    // Rivers
                    if (RIVERS.some(r => r.x === x && r.y === y)) {
                        const pulse = 0.2 + 0.1 * Math.sin(ts / 500);
                        ctx.fillStyle = `rgba(59, 130, 246, ${pulse})`;
                        ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
                        ctx.strokeRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    }

                    // Traps
                    if (TRAPS.some(t => t.x === x && t.y === y)) {
                        ctx.fillStyle = 'rgba(248, 113, 113, 0.1)';
                        ctx.fillRect(tx + 5, ty + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                        ctx.strokeStyle = 'rgba(248, 113, 113, 0.4)';
                        ctx.setLineDash([5, 5]);
                        ctx.strokeRect(tx + 8, ty + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                        ctx.setLineDash([]);
                    }

                    // Dens
                    if (DENS.some(d => d.x === x && d.y === y)) {
                        const isWinDen = DENS.find(d => d.x === x && d.y === y).owner !== 0;
                        ctx.fillStyle = isWinDen ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = isWinDen ? '#4ade80' : '#fff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }

            // 3. Draw Valid Move Indicators
            validMoves.forEach(m => {
                const tx = getRenderX(m.x) * TILE_SIZE;
                const ty = getRenderY(m.y) * TILE_SIZE;
                ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
                ctx.beginPath();
                ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 8, 0, Math.PI * 2);
                ctx.fill();
            });

            // 4. Draw Pieces
            pieces.forEach(p => {
                const tx = getRenderX(p.x) * TILE_SIZE;
                const ty = getRenderY(p.y) * TILE_SIZE;
                const isSelected = selectedPiece && selectedPiece.x === p.x && selectedPiece.y === p.y;
                const isMyTurn = turn === myId;
                const isMyPiece = p.ownerId === myId;

                ctx.save();
                ctx.translate(tx + TILE_SIZE/2, ty + TILE_SIZE/2);

                // Glow effect for selected or playable piece
                if (isSelected) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = p.ownerId === myId ? '#4ade80' : '#60a5fa';
                } else {
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                }

                // Piece Base (3D Coin Style)
                const gradOuter = ctx.createLinearGradient(-30, -30, 30, 30);
                gradOuter.addColorStop(0, p.ownerId === myId ? '#166534' : '#1e3a8a');
                gradOuter.addColorStop(1, p.ownerId === myId ? '#052e16' : '#172554');
                
                ctx.fillStyle = gradOuter;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 6, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = isSelected ? '#fff' : (p.ownerId === myId ? '#4ade80' : '#60a5fa');
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.stroke();

                // Inner Ring (Gold/Silver Trim)
                ctx.strokeStyle = p.ownerId === myId ? 'rgba(74, 222, 128, 0.4)' : 'rgba(96, 165, 250, 0.4)';
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 12, 0, Math.PI * 2);
                ctx.stroke();

                // Animal Icon (Emoji/SVG)
                const icons = { 1: '🐀', 2: '🐱', 3: '🐕', 4: '🐺', 5: '🐆', 6: '🐅', 7: '🦁', 8: '🐘' };
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.font = `${TILE_SIZE/2.2}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Adjusting Y-offset to make it look centered in the coin
                ctx.fillText(icons[p.type], 0, 3);

                // Rank Badge
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath();
                ctx.arc(TILE_SIZE/4, -TILE_SIZE/4, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Inter';
                ctx.fillText(p.type, TILE_SIZE/4, -TILE_SIZE/4 + 1);

                ctx.restore();
            });

            // 5. Draw Hint (if any)
            if (activeHint) {
                const { from, to } = activeHint;
                const fx = getRenderX(from.x) * TILE_SIZE + TILE_SIZE/2;
                const fy = getRenderY(from.y) * TILE_SIZE + TILE_SIZE/2;
                const tx = getRenderX(to.x) * TILE_SIZE + TILE_SIZE/2;
                const ty = getRenderY(to.y) * TILE_SIZE + TILE_SIZE/2;

                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.setLineDash([10, 5]);
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(tx, ty);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            frameId = requestAnimationFrame(render);
        };

        render(0);
        return () => cancelAnimationFrame(frameId);
    }, [pieces, selectedPiece, validMoves, turn, myId, activeHint]);

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const rawX = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
        const rawY = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);
        const x = myId === 1 ? 6 - rawX : rawX;
        const y = myId === 1 ? rawY : 8 - rawY;
        handleSelect(x, y);
    };

    const isMyTurn = turn === myId;

    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', padding: '0.5rem', boxSizing: 'border-box' }}>
            <div className="glass-panel game-play-panel" style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1.2rem',
                gap: '1.5rem',
                alignItems: 'stretch',
                justifyContent: 'center',
                height: 'fit-content',
                maxHeight: '96vh',
                width: 'max-content',
                maxWidth: '98%',
                borderRadius: '20px',
                background: 'rgba(23, 23, 33, 0.85)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>
                
                {/* LEFT: INFO & RULES */}
                <div style={{
                    flex: '0 1 260px',
                    width: '260px',
                    minWidth: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.2rem',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: '1.2rem' }}>📊</span> Cấp bậc & Quyền
                    </h3>

                    <div style={{
                        flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)',
                        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                        display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                            {[8,7,6,5,4,3,2,1].map(v => (
                                <div key={v} style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                                    <span style={{ color: '#94a3b8' }}>{v}. {PIECE_NAMES[v]}</span>
                                    {v === 8 && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>(&gt;1)</span>}
                                    {v === 1 && <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>(&gt;8)</span>}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                            <strong style={{ color: '#fbbf24' }}>Gợi ý:</strong> Nhảy qua sông bằng Hổ/Sư tử. Chuột có thể bơi dưới sông. Đưa quân vào Hang đối phương để thắng!
                        </div>
                    </div>
                </div>

                {/* MIDDLE: BOARD */}
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: '320px', padding: 0, margin: 0, maxHeight: '100%' }}>
                    {/* Status Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 18px', marginBottom: '10px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={18} color="#4ade80" />
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>Cờ Thú</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: turn === myId ? 1 : 0.5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: turn === myId ? '#4ade80' : '#fff' }}>BẠN {turn === myId ? '(Đang đi)' : ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: turn !== myId ? 1 : 0.5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 10px #60a5fa' }} />
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: turn !== myId ? '#60a5fa' : '#fff' }}>ĐỐI THỦ {turn !== myId && turn !== null ? '(Đang đi)' : ''}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fbbf2433' }}>
                                {difficulty.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="game-play-board jungle-board" style={{
                        position: 'relative',
                        border: '6px solid rgba(15, 15, 25, 0.95)',
                        borderRadius: '12px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        background: '#0f172a',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        /* Add responsive logic */
                        width: '100%',
                        maxHeight: 'calc(100vh - 120px)',
                        aspectRatio: '7 / 9',
                        flex: '1 1 auto'
                    }}>
                        {pieces.length === 0 && !gameOver && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'rgba(15, 23, 42, 0.9)' }}>
                                <RefreshCw className="animate-spin" size={48} color="#4ade80" style={{ marginBottom: '15px' }} />
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>ĐANG KẾT NỐI...</span>
                            </div>
                        )}
                        
                        <canvas 
                            ref={canvasRef} 
                            width={MAP_SIZE_W} 
                            height={MAP_SIZE_H} 
                            onClick={handleCanvasClick}
                            style={{ 
                                display: 'block', 
                                cursor: isMyTurn ? 'pointer' : 'default',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }} 
                        />
                    </div>
                </div>

                {/* RIGHT: CONTROLS */}
                <div style={{ flex: '0 1 260px', width: '260px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>CỜ THÚ</div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button className="btn-primary" onClick={handleReset}><RotateCcw size={18} /> Chơi ván mới</button>
                            
                            <button className="btn-secondary" onClick={getHint} disabled={turn !== myId} style={{ borderColor: '#fbbf24', color: '#fbbf24' }}>
                                <HelpCircle size={18} /> Gợi ý nước đi (AI)
                            </button>
                            
                            <button className="btn-secondary" onClick={() => navigate('/jungle')}><ArrowLeft size={18} /> Thoát</button>
                        </div>
                    </div>

                    <div style={{ borderRadius: '12px', padding: '15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>🛡 Phòng Thủ</div>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                            Hãy cẩn thận với <b>Bẫy (Traps)</b> xung quanh Hang. Bất kỳ quân nào sa vào bẫy đều sẽ bị giảm sức mạnh và ai cũng ăn được!
                        </p>
                    </div>
                </div>

                {/* GAME OVER SYNC OVERLAY */}
                {gameOver !== null && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, gap: '20px' }}>
                        <Trophy size={80} color={gameOver === myId ? '#fbbf24' : '#94a3b8'} style={{ marginBottom: '-10px' }} />
                        <h2 style={{ fontSize: '3rem', fontWeight: 900, color: gameOver === myId ? '#fbbf24' : '#fff', margin: 0 }}>
                            {gameOver === myId ? 'BẠN ĐÃ THẮNG!' : 'BẠN ĐÃ THUA...'}
                        </h2>
                        <button className="btn-primary" onClick={handleReset}>Chơi lại</button>
                        <button className="btn-secondary" onClick={() => navigate('/jungle')}>Trở về sảnh</button>
                    </div>
                )}
            </div>
        </div>
    );
}
