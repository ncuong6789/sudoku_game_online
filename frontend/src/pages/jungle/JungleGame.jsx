import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJungleLogic } from './useJungleLogic';
import { useJungleSounds } from './useJungleSounds';
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

const ANIMAL_ICONS = {
    1: '🐀', 2: '🐱', 3: '🐕', 4: '🐺', 5: '🐆', 6: '🐅', 7: '🦁', 8: '🐘'
};

const ANIMAL_COLORS = {
    1: '#9ca3af', 2: '#f97316', 3: '#a855f7', 4: '#ef4444', 5: '#eab308', 6: '#f59e0b', 7: '#eab308', 8: '#64748b'
};

export default function JungleGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode, difficulty } = location.state || { roomId: 'local', mode: 'solo', difficulty: 'medium' };
    
    const canvasRef = useRef(null);
    const [activeHint, setActiveHint] = useState(null);
    
    const { playSelect, playMove, playCapture, playWin, playLose } = useJungleSounds();

    const { pieces, turn, selectedPiece, validMoves, gameOver, handleSelect, myId } = useJungleLogic(
        roomId, mode, difficulty, 
        (move) => {
            setActiveHint(move);
            setTimeout(() => setActiveHint(null), 3000);
        },
        (isJump) => playMove(isJump),
        () => playCapture(),
        (winner) => {
            if (winner === myId) playWin();
            else playLose();
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
            // 1. Clear & Background with gradient
            const bgGrad = ctx.createLinearGradient(0, 0, MAP_SIZE_W, MAP_SIZE_H);
            bgGrad.addColorStop(0, '#0f172a');
            bgGrad.addColorStop(0.5, '#1e293b');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, MAP_SIZE_W, MAP_SIZE_H);

            // 2. Draw Grid & Special Tiles
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    const tx = getRenderX(x) * TILE_SIZE;
                    const ty = getRenderY(y) * TILE_SIZE;

                    // Base Tile - subtle grid
                    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);

                    // Grass pattern for land tiles
                    if (!RIVERS.some(r => r.x === x && r.y === y)) {
                        ctx.fillStyle = 'rgba(34, 197, 94, 0.03)';
                        ctx.fillRect(tx + 1, ty + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    }

                    // Rivers - enhanced water effect
                    if (RIVERS.some(r => r.x === x && r.y === y)) {
                        const waveOffset = Math.sin(ts / 400 + x * 0.5 + y * 0.3) * 0.15;
                        const waterGrad = ctx.createLinearGradient(tx, ty, tx + TILE_SIZE, ty + TILE_SIZE);
                        waterGrad.addColorStop(0, `rgba(59, 130, 246, ${0.4 + waveOffset})`);
                        waterGrad.addColorStop(0.5, `rgba(37, 99, 235, ${0.5 + waveOffset})`);
                        waterGrad.addColorStop(1, `rgba(59, 130, 246, ${0.4 + waveOffset})`);
                        ctx.fillStyle = waterGrad;
                        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                        
                        // Water wave lines
                        ctx.strokeStyle = 'rgba(147, 197, 253, 0.3)';
                        ctx.lineWidth = 1;
                        for (let w = 0; w < 3; w++) {
                            const wy = ty + 15 + w * 20 + Math.sin(ts / 300 + w) * 3;
                            ctx.beginPath();
                            ctx.moveTo(tx + 5, wy);
                            ctx.lineTo(tx + TILE_SIZE - 5, wy);
                            ctx.stroke();
                        }
                    }

                    // Traps - enhanced trap visualization
                    if (TRAPS.some(t => t.x === x && t.y === y)) {
                        ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
                        ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                        
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'rgba(248, 113, 113, 0.6)';
                        ctx.fillText('💀', tx + TILE_SIZE/2, ty + TILE_SIZE/2);
                        
                        const trapPulse = 0.4 + 0.2 * Math.sin(ts / 300);
                        ctx.strokeStyle = `rgba(248, 113, 113, ${trapPulse})`;
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 4]);
                        ctx.strokeRect(tx + 6, ty + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                        ctx.setLineDash([]);
                    }

                    // Dens - enhanced den visualization
                    if (DENS.some(d => d.x === x && d.y === y)) {
                        const den = DENS.find(d => d.x === x && d.y === y);
                        const isWinDen = den.owner !== 0;
                        const denGrad = ctx.createRadialGradient(
                            tx + TILE_SIZE/2, ty + TILE_SIZE/2, 0,
                            tx + TILE_SIZE/2, ty + TILE_SIZE/2, TILE_SIZE/2
                        );
                        if (isWinDen) {
                            denGrad.addColorStop(0, 'rgba(74, 222, 128, 0.3)');
                            denGrad.addColorStop(1, 'rgba(74, 222, 128, 0.1)');
                        } else {
                            denGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                            denGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
                        }
                        ctx.fillStyle = denGrad;
                        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                        
                        ctx.font = '24px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = isWinDen ? '#4ade80' : '#94a3b8';
                        ctx.fillText('🏠', tx + TILE_SIZE/2, ty + TILE_SIZE/2);
                        
                        ctx.strokeStyle = isWinDen ? '#4ade80' : '#fff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }

            // 3. Draw Valid Move Indicators - enhanced
            validMoves.forEach(m => {
                const tx = getRenderX(m.x) * TILE_SIZE;
                const ty = getRenderY(m.y) * TILE_SIZE;
                
                // Pulsing dot
                const pulse = 0.3 + 0.15 * Math.sin(ts / 200);
                ctx.fillStyle = `rgba(74, 222, 128, ${pulse})`;
                ctx.beginPath();
                ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner dot
                ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
                ctx.beginPath();
                ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 5, 0, Math.PI * 2);
                ctx.fill();
            });

            // 4. Draw Pieces with enhanced visuals
            pieces.forEach(p => {
                const tx = getRenderX(p.x) * TILE_SIZE;
                const ty = getRenderY(p.y) * TILE_SIZE;
                const isSelected = selectedPiece && selectedPiece.x === p.x && selectedPiece.y === p.y;
                const isMyPiece = p.ownerId === myId;

                ctx.save();
                ctx.translate(tx + TILE_SIZE/2, ty + TILE_SIZE/2);

                // Animated selection ring
                if (isSelected) {
                    const ringPulse = 1 + Math.sin(ts / 150) * 0.15;
                    ctx.shadowBlur = 25;
                    ctx.shadowColor = isMyPiece ? '#4ade80' : '#60a5fa';
                    
                    ctx.strokeStyle = isMyPiece ? 'rgba(74, 222, 128, 0.5)' : 'rgba(96, 165, 250, 0.5)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, (TILE_SIZE/2 - 2) * ringPulse, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Piece base with 3D gradient
                const pieceGrad = ctx.createRadialGradient(-5, -5, 0, 0, 0, TILE_SIZE/2 - 4);
                if (isMyPiece) {
                    pieceGrad.addColorStop(0, '#22c55e');
                    pieceGrad.addColorStop(0.7, '#166534');
                    pieceGrad.addColorStop(1, '#052e16');
                } else {
                    pieceGrad.addColorStop(0, '#3b82f6');
                    pieceGrad.addColorStop(0.7, '#1e3a8a');
                    pieceGrad.addColorStop(1, '#172554');
                }
                
                ctx.fillStyle = pieceGrad;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Border
                ctx.strokeStyle = isSelected ? '#fff' : (isMyPiece ? '#4ade80' : '#60a5fa');
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.stroke();

                // Inner glow ring
                ctx.strokeStyle = isMyPiece ? 'rgba(74, 222, 128, 0.3)' : 'rgba(96, 165, 250, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 10, 0, Math.PI * 2);
                ctx.stroke();

                // Animal icon with color tint
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.font = `${TILE_SIZE/2.5}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ANIMAL_ICONS[p.type], 0, 2);

                // Rank badge with animation
                const badgePulse = isSelected ? 1 + Math.sin(ts / 200) * 0.1 : 1;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.beginPath();
                ctx.arc(TILE_SIZE/4 * badgePulse, -TILE_SIZE/4 * badgePulse, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillText(p.type, TILE_SIZE/4, -TILE_SIZE/4 + 1);

                ctx.restore();
            });

            // 5. Draw Hint with animation
            if (activeHint) {
                const { from, to } = activeHint;
                const fx = getRenderX(from.x) * TILE_SIZE + TILE_SIZE/2;
                const fy = getRenderY(from.y) * TILE_SIZE + TILE_SIZE/2;
                const tx = getRenderX(to.x) * TILE_SIZE + TILE_SIZE/2;
                const ty = getRenderY(to.y) * TILE_SIZE + TILE_SIZE/2;

                // Animated dashed line
                const dashOffset = (ts / 50) % 20;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4;
                ctx.setLineDash([10, 5]);
                ctx.lineDashOffset = -dashOffset;
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(tx, ty);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Arrow head
                const angle = Math.atan2(ty - fy, tx - fx);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx - 15 * Math.cos(angle - Math.PI/6), ty - 15 * Math.sin(angle - Math.PI/6));
                ctx.lineTo(tx - 15 * Math.cos(angle + Math.PI/6), ty - 15 * Math.sin(angle + Math.PI/6));
                ctx.closePath();
                ctx.fill();
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
        
        const piece = pieces.find(p => p.x === x && p.y === y);
        if (piece && piece.ownerId === myId) {
            handleSelect(x, y, playSelect);
        } else {
            handleSelect(x, y);
        }
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
