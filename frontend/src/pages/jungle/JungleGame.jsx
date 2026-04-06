import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJungleLogic } from './useJungleLogic';
import { Swords, Trophy, Activity, ArrowLeft, RefreshCw, Heart, Target, Shield, Info, HelpCircle } from 'lucide-react';

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
    const { roomId, mode, difficulty } = location.state || { roomId: 'local', mode: 'single', difficulty: 'medium' };
    
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
                    const tx = x * TILE_SIZE;
                    const ty = (8 - y) * TILE_SIZE; // Flip Y for player perspective (P1 at bottom)

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
                const tx = m.x * TILE_SIZE;
                const ty = (8 - m.y) * TILE_SIZE;
                ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
                ctx.beginPath();
                ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 8, 0, Math.PI * 2);
                ctx.fill();
            });

            // 4. Draw Pieces
            pieces.forEach(p => {
                const tx = p.x * TILE_SIZE;
                const ty = (8 - p.y) * TILE_SIZE;
                const isSelected = selectedPiece && selectedPiece.x === p.x && selectedPiece.y === p.y;
                const isMyTurn = turn === myId;
                const isMyPiece = p.ownerId === myId;

                ctx.save();
                ctx.translate(tx + TILE_SIZE/2, ty + TILE_SIZE/2);

                // Glow effect for selected or playable piece
                if (isSelected) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = p.owner === 0 ? '#4ade80' : '#60a5fa';
                }

                // Piece Base (Glassmorphism Disc)
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, TILE_SIZE/2 - 5);
                gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
                gradient.addColorStop(1, 'rgba(255,255,255,0.02)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = isSelected ? '#fff' : (p.owner === 0 ? '#4ade80' : '#60a5fa');
                ctx.lineWidth = isSelected ? 3 : 1.5;
                ctx.stroke();

                // Inner Ring
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE/2 - 14, 0, Math.PI * 2);
                ctx.stroke();

                // Animal Icon (Emoji/SVG)
                const icons = { 1: '🐀', 2: '🐱', 3: '🐕', 4: '🐺', 5: '🐆', 6: '🐅', 7: '🦁', 8: '🐘' };
                ctx.shadowBlur = 0;
                ctx.font = `${TILE_SIZE/2.2}px "Segoe UI Emoji"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icons[p.type], 0, 2);

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
                const fx = from.x * TILE_SIZE + TILE_SIZE/2;
                const fy = (8 - from.y) * TILE_SIZE + TILE_SIZE/2;
                const tx = to.x * TILE_SIZE + TILE_SIZE/2;
                const ty = (8 - to.y) * TILE_SIZE + TILE_SIZE/2;

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
    }, [pieces, selectedPiece, validMoves, turn, myId]);

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
        const y = 8 - Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);
        handleSelect(x, y);
    };

    const isMyTurn = turn === myId;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 0.5rem' }}>
            <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                
                {/* Header Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 18px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={18} color="#4ade80" />
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Cờ Thú Online</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>· {roomId}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: turn === myId ? 1 : 0.5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: turn === myId ? '#4ade80' : '#fff' }}>BẠN {turn === myId ? '(Đang đi)' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: turn !== myId ? 1 : 0.5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 10px #60a5fa' }} />
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: turn !== myId ? '#60a5fa' : '#fff' }}>ĐỐI THỦ {turn !== myId ? '(Đang đi)' : ''}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fbbf2433' }}>
                            {difficulty.toUpperCase()}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '12px' }}>
                    
                    {/* Left Column */}
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ borderRadius: '12px', padding: '15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>📊 Cấp bậc (Mạnh &rarr; Yếu)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                {[8,7,6,5,4,3,2,1].map(v => (
                                    <div key={v} style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                                        <span style={{ color: '#94a3b8' }}>{v}. {PIECE_NAMES[v]}</span>
                                        {v === 8 && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>(&gt;1)</span>}
                                        {v === 1 && <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>(&gt;8)</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ borderRadius: '12px', padding: '15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>💡 Gợi ý</div>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', margin: 0 }}>
                                Nhảy qua sông bằng Hổ/Sư tử. Chuột có thể bơi dưới sông. Đưa quân vào Hang đối phương để thắng!
                            </p>
                        </div>
                    </div>

                    {/* Middle Column */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', border: '5px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <canvas 
                                ref={canvasRef} 
                                width={MAP_SIZE_W} 
                                height={MAP_SIZE_H} 
                                onClick={handleCanvasClick}
                                style={{ display: 'block', cursor: isMyTurn ? 'pointer' : 'default' }} 
                            />

                            {/* Game Over Overlay */}
                            {gameOver && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,22,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                                    <Trophy size={80} color={gameOver === myId ? '#fbbf24' : '#94a3b8'} style={{ marginBottom: '20px' }} />
                                    <h2 style={{ fontSize: '3rem', fontWeight: 900, color: gameOver === myId ? '#fbbf24' : '#fff', margin: 0 }}>{gameOver === myId ? 'CHIẾN THẮNG!' : 'THẤT BẠI...'}</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '30px' }}>{gameOver === myId ? 'Bạn đã chinh phục hang ổ đối phương.' : 'Hang ổ của bạn đã bị chiếm đóng.'}</p>
                                    <button className="btn-primary" onClick={() => navigate('/jungle')} style={{ maxWidth: '200px' }}>Quay lại sảnh</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ borderRadius: '12px', padding: '15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>🛡 Phòng Thủ</div>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '20px' }}>
                                Hãy cẩn thận với <b>Bẫy (Traps)</b> xung quanh Hang. Bất kỳ quân nào sa vào bẫy đều sẽ bị giảm sức mạnh!
                            </p>
                            
                            <button className="btn-secondary" onClick={getHint} style={{ width: '100%', marginBottom: '10px' }}>
                                <HelpCircle size={18} /> GỢI Ý MÁY (AI)
                            </button>
                        </div>
                        <button className="btn-secondary" onClick={() => navigate('/jungle')} style={{ padding: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <ArrowLeft size={18} /> THOÁT GAME
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
