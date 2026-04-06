import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTankLogic } from './useTankLogic';
import { Swords, Trophy, Activity, ArrowLeft, RefreshCw, Heart, Target, Shield, Info } from 'lucide-react';

const MAP_SIZE = 800;
const TANK_SIZE = 40;
const TILE_SIZE = 40;

export default function TankGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode } = location.state || { roomId: 'local', mode: 'single' };
    
    const canvasRef = useRef(null);
    const { gameState, tanks, bullets, explosions, map, myId, localTank } = useTankLogic(roomId, mode);
    
    const [images, setImages] = useState({});
    const [assetsLoaded, setAssetsLoaded] = useState(false);

    // Load assets
    useEffect(() => {
        const assetList = {
            'tank': '/assets/tank/texture.png',
            'brick': '/assets/tank/brick.png',
            'stone': '/assets/tank/stone.png',
            'water': '/assets/tank/water.png',
            'bush': '/assets/tank/bush.png',
            'ice': '/assets/tank/ice.png'
        };

        const loaded = {};
        let count = 0;
        const total = Object.keys(assetList).length;

        Object.entries(assetList).forEach(([name, src]) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loaded[name] = img;
                count++;
                if (count === total) {
                    setImages(loaded);
                    setAssetsLoaded(true);
                }
            };
            img.onerror = () => {
                count++;
                if (count === total) {
                    setImages(loaded);
                    setAssetsLoaded(true);
                }
            };
        });
    }, []);

    // Drawing Loop
    useEffect(() => {
        if (!assetsLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frameId;

        const render = () => {
            // 1. Clear Canvas
            ctx.fillStyle = '#0a0a10';
            ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

            // 2. Draw Map Tiles
            if (map && map.length > 0) {
                map.forEach((row, y) => {
                    row.forEach((tile, x) => {
                        if (tile === 0) return;
                        const tx = x * TILE_SIZE;
                        const ty = y * TILE_SIZE;
                        let img = null;
                        if (tile === 1) img = images.brick;
                        else if (tile === 2) img = images.stone;
                        else if (tile === 3) img = images.water;
                        else if (tile === 4) img = images.bush;
                        else if (tile === 5) img = images.ice;

                        if (img) ctx.drawImage(img, tx, ty, TILE_SIZE, TILE_SIZE);
                        else {
                            ctx.fillStyle = tile === 1 ? '#922' : tile === 2 ? '#666' : tile === 3 ? '#229' : '#141';
                            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                        }
                    });
                });
            }

            // 3. Draw Bullets
            bullets.forEach(bullet => {
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // 4. Draw Tanks
            Object.values(tanks).forEach(tank => {
                if (tank.isDestroyed) return;
                ctx.save();
                ctx.translate(tank.x, tank.y);
                ctx.rotate((tank.rotation * Math.PI) / 180);
                
                // Draw Tank Body
                ctx.fillStyle = tank.color === 'green' ? '#4ade80' : '#60a5fa';
                ctx.fillRect(-15, -15, 30, 30);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(-15, -15, 30, 30);
                
                // Draw Barrel
                ctx.fillStyle = '#fff';
                ctx.fillRect(-2, -22, 4, 15);
                ctx.restore();

                // Health Bar
                const barWidth = 34;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(tank.x - barWidth/2, tank.y - 28, barWidth, 4);
                ctx.fillStyle = tank.health > 50 ? '#4ade80' : tank.health > 20 ? '#fbbf24' : '#ef4444';
                ctx.fillRect(tank.x - barWidth/2, tank.y - 28, (tank.health / 100) * barWidth, 4);
            });

            // 5. Draw Explosions
            explosions.forEach(exp => {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                ctx.beginPath(); ctx.arc(exp.x, exp.y, 25, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
                ctx.beginPath(); ctx.arc(exp.x, exp.y, 15, 0, Math.PI * 2); ctx.fill();
            });

            frameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameId);
    }, [assetsLoaded, tanks, bullets, explosions, images, map]);

    const myTank = tanks[myId];
    const isWin = gameState === 'finished' && myTank && !myTank.isDestroyed;

    const panelStyle = { 
        borderRadius: '12px', 
        padding: '14px', 
        background: 'rgba(255,255,255,0.04)', 
        border: '1px solid rgba(255,255,255,0.08)', 
        marginBottom: '12px' 
    };
    const labelStyle = { 
        fontSize: '0.72rem', 
        color: '#94a3b8', 
        marginBottom: '10px', 
        fontWeight: 700, 
        letterSpacing: '0.08em', 
        textTransform: 'uppercase' 
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ 
                position: 'relative', 
                width: '100%', 
                maxWidth: '1200px', 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '1.2rem',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                
                {/* ─── HEADER BAR ────────────────────────────────────── */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto 1fr', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRadius: '12px', 
                    padding: '10px 18px', 
                    marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={18} color="var(--accent-color)" />
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '0.5px' }}>TANK WARS</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                            {roomId}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center' }}>
                        {Object.values(tanks).map(tank => (
                            <div key={tank.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tank.color === 'green' ? '#4ade80' : '#60a5fa', boxShadow: `0 0 10px ${tank.color === 'green' ? '#4ade80' : '#60a5fa'}` }} />
                                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                                    {tank.id === myId ? 'BẠN' : 'ĐỐI THỦ'}: <span style={{ color: tank.health > 20 ? (tank.color === 'green' ? '#4ade80' : '#60a5fa') : '#f87171' }}>{tank.health}%</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '0.8rem', 
                            fontWeight: 700,
                            background: gameState === 'finished' ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
                            color: gameState === 'finished' ? '#fbbf24' : '#4ade80',
                            border: `1px solid ${gameState === 'finished' ? '#fbbf2433' : '#4ade8033'}`
                        }}>
                            {gameState === 'finished' ? 'TRẬN ĐẤU KẾT THÚC' : 'ĐANG CHIẾN ĐẤU...'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '12px' }}>
                    
                    {/* ─── LEFT COLUMN: CONTROLS & TERRAIN ───────────────── */}
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ ...panelStyle, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                            <div style={labelStyle}>🎮 Điều Khiển</div>
                            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '5px', border: '1px solid #334155', color: '#fff' }}>WASD</kbd>
                                    <span>Di chuyển</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '5px', border: '1px solid #334155', color: '#fff' }}>SPACE</kbd>
                                    <span>Bắn đạn</span>
                                </div>
                            </div>
                        </div>

                        <div style={panelStyle}>
                            <div style={labelStyle}>🗺 Chú Giải Bản Đồ</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 16, height: 16, background: '#922', borderRadius: '3px' }} />
                                    <span>Gạch (Phá được)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 16, height: 16, background: '#666', borderRadius: '3px' }} />
                                    <span>Đá (Bất tử)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 16, height: 16, background: '#229', borderRadius: '3px' }} />
                                    <span>Nước (Cản xe)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── MIDDLE COLUMN: GAME CANVAS ───────────────────── */}
                    <div style={{ flex: 1, position: 'relative', border: '4px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', background: '#000', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }}>
                        {!assetsLoaded && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,22,0.95)', zIndex: 10, gap: '15px' }}>
                                <RefreshCw className="animate-spin" size={48} color="var(--accent-color)" />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐANG TẢI TÀI NGUYÊN...</span>
                            </div>
                        )}
                        
                        {map.length === 0 && !gameState === 'finished' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,22,0.95)', zIndex: 10, gap: '15px' }}>
                                <RefreshCw className="animate-spin" size={48} color="var(--accent-color)" />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐANG KẾT NỐI CHIẾN TRƯỜNG...</span>
                            </div>
                        )}
                        
                        <canvas 
                            ref={canvasRef} 
                            width={MAP_SIZE} 
                            height={MAP_SIZE} 
                            style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} 
                        />

                        {/* Game Over Overlay */}
                        {gameState === 'finished' && (
                            <div style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                background: 'rgba(10,14,22,0.9)', 
                                zIndex: 40, 
                                textAlign: 'center',
                                backdropFilter: 'blur(4px)',
                                animation: 'fadeIn 0.6s ease'
                            }}>
                                <div style={{ 
                                    padding: '40px', 
                                    borderRadius: '24px', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    border: `2px solid ${isWin ? '#fbbf2444' : '#f8717144'}`,
                                    boxShadow: `0 0 40px ${isWin ? '#fbbf2422' : '#f8717122'}`
                                }}>
                                    <Trophy size={80} color={isWin ? '#fbbf24' : '#94a3b8'} style={{ marginBottom: '20px', filter: isWin ? 'drop-shadow(0 0 15px #fbbf24)' : 'none' }} />
                                    <h2 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 10px 0', color: isWin ? '#fbbf24' : '#fff', letterSpacing: '2px' }}>
                                        {isWin ? 'VICTORY!' : 'DEFEAT...'}
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '30px', fontWeight: 500 }}>
                                        {isWin ? 'Bạn đã hủy diệt đối thủ hoàn toàn.' : 'Xe tăng của bạn đã nổ tung.'}
                                    </p>
                                    <button className="btn-primary" onClick={() => navigate('/tank')} style={{ padding: '14px 40px', fontSize: '1.1rem', fontWeight: 700 }}>QUAY LẠI SẢNH</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── RIGHT COLUMN: STATUS & EXIT ───────────────────── */}
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={panelStyle}>
                            <div style={labelStyle}>🛡 Trình Trạng Đội</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {Object.values(tanks).map(tank => (
                                    <div key={tank.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: tank.color === 'green' ? '#4ade80' : '#60a5fa' }}>
                                                {tank.id === myId ? 'BẠN' : 'ĐỊCH'}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                                {tank.isDestroyed ? 'DEAD' : 'ALIVE'}
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ 
                                                height: '100%', 
                                                width: `${tank.health}%`, 
                                                background: tank.color === 'green' ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)', 
                                                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: `0 0 8px ${tank.color === 'green' ? '#4ade8066' : '#60a5fa66'}`
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ ...panelStyle, marginTop: '0', flex: 1 }}>
                            <div style={labelStyle}>📢 Thông báo</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: '1.5' }}>
                                {gameState === 'playing' ? 'Trận chiến đang diễn ra khốc liệt! Hãy cẩn thận khi đối mặt trực tiếp.' : 'Trận đấu đã khép lại. Nhấn thoát để tìm trận mới.'}
                            </div>
                        </div>

                        <button className="btn-secondary" onClick={() => navigate('/tank')} style={{ padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <ArrowLeft size={18} /> THOÁT TRẬN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
