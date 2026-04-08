import React, { useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTankLogic } from './useTankLogic';

// ─── Constants ──────────────────────────────────────────────────
const MAP_COLS = 26;
const MAP_ROWS = 26;
const TILE = 24; // pixels per grid cell
const CANVAS_W = MAP_COLS * TILE; // 624
const CANVAS_H = MAP_ROWS * TILE; // 624

// Tile types: 0=empty 1=brick 2=steel 3=water 4=bush 5=ice 6=base
// Colors palette matching original Battle City NES look
const PALETTE = {
    bg:     '#0a0a10',
    brick:  { top: '#d4471a', mid: '#b03a14', mortar: '#602010' },
    steel:  { top: '#a0b0c0', mid: '#6080a0', shine: '#d0e0f0' },
    water1: '#1060a0',
    water2: '#2080c0',
    bush:   '#1a6020',
    bush2:  '#2a8030',
    ice:    '#a0d8f0',
    ice2:   '#c8eeff',
};

// Enemy type colors
const ENEMY_COLORS = {
    basic: '#c8c8c8',
    fast:  '#e0b010',
    power: '#d03030',
    armor: '#40a040',
};

// Item type icons/colors
const ITEM_DEFS = {
    star:    { icon: '⭐', glow: '#ffd700' },
    grenade: { icon: '💣', glow: '#ff4444' },
    helmet:  { icon: '⛑️',  glow: '#44aaff' },
    tank:    { icon: '🔋', glow: '#44ff88' },
    clock:   { icon: '⏱', glow: '#aa44ff' },
    shovel:  { icon: '🪛', glow: '#ff8844' },
};

// ─── Pure Drawing Utilities ──────────────────────────────────────

function drawBrick(ctx, x, y, w, h) {
    const { top, mid, mortar } = PALETTE.brick;
    ctx.fillStyle = mid;
    ctx.fillRect(x, y, w, h);
    // Mortar lines
    ctx.fillStyle = mortar;
    ctx.fillRect(x, y + Math.floor(h * 0.5), w, 1);
    ctx.fillRect(x, y, 1, h);
    const hw = Math.floor(w / 2);
    ctx.fillRect(x + hw, y, 1, Math.floor(h * 0.5));
    ctx.fillRect(x, y + Math.floor(h * 0.5), hw, 1);
    ctx.fillRect(x + hw, y + Math.floor(h * 0.5) + 1, w - hw, Math.floor(h * 0.5));
    // Highlight top-left
    ctx.fillStyle = top;
    ctx.fillRect(x + 1, y + 1, hw - 2, 2);
    ctx.fillRect(x + hw + 1, y + Math.floor(h * 0.5) + 1, w - hw - 2, 2);
}

function drawSteel(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.steel.mid;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.steel.top;
    ctx.fillRect(x, y, w - 2, 2);
    ctx.fillRect(x, y, 2, h - 2);
    ctx.fillStyle = '#304050';
    ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillStyle = PALETTE.steel.shine;
    ctx.fillRect(x + 2, y + 2, 3, 3);
}

function drawWater(ctx, x, y, w, h, tick) {
    const alt = Math.floor(tick / 30) % 2 === 0;
    ctx.fillStyle = alt ? PALETTE.water1 : PALETTE.water2;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = alt ? PALETTE.water2 : PALETTE.water1;
    // Draw wave pattern
    for (let i = 0; i < h; i += 4) {
        ctx.fillRect(x, y + i, w, 2);
    }
}

function drawBush(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.bush;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.bush2;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillRect(x, y + 4, 2, h - 8);
    ctx.fillRect(x + w - 2, y + 4, 2, h - 8);
}

function drawIce(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.ice;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.ice2;
    ctx.fillRect(x + 2, y + 2, 4, 2);
    ctx.fillRect(x + w/2, y + h/2, 5, 2);
}

function drawEagle(ctx, x, y, w, h, destroyed) {
    // Draw base / Eagle icon
    const cx = x + w / 2;
    const cy = y + h / 2;
    // Base plate
    ctx.fillStyle = destroyed ? '#442200' : '#1a1a2e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = destroyed ? '#662200' : '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // Eagle shape
    if (!destroyed) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `${Math.floor(h * 0.7)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦅', cx, cy);
    } else {
        ctx.fillStyle = '#ff4400';
        ctx.font = `${Math.floor(h * 0.7)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', cx, cy);
    }
}

function drawTank(ctx, tank, TILE, isPlayer, starLevel = 0, invulnerable = false) {
    const px = tank.x * TILE;
    const py = tank.y * TILE;
    const sz = tank.w * TILE;

    // Invulnerability blink
    if (invulnerable && Math.floor(Date.now() / 150) % 2 === 0) return;

    // Flashing enemies (carries item)
    if (tank.isFlashing && Math.floor(Date.now() / 200) % 2 === 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 2, py - 2, sz + 4, sz + 4);
    }

    ctx.save();
    ctx.translate(px + sz / 2, py + sz / 2);

    const dirAngles = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
    ctx.rotate(dirAngles[tank.dir] || 0);

    const color = isPlayer
        ? (starLevel === 0 ? '#4ade80' : starLevel === 1 ? '#60d060' : starLevel === 2 ? '#ffd700' : '#ff8c00')
        : ENEMY_COLORS[tank.type] || '#aaa';

    const dark = isPlayer ? '#22602e' : '#445566';
    const h = sz;

    // Tracks (left + right stripes)
    ctx.fillStyle = '#333';
    ctx.fillRect(-h / 2, -h / 2, 4, h);
    ctx.fillRect(h / 2 - 4, -h / 2, 4, h);
    ctx.fillStyle = '#555';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-h / 2 + 1, -h / 2 + 4 + i * (h - 8) / 3, 2, 4);
        ctx.fillRect(h / 2 - 3, -h / 2 + 4 + i * (h - 8) / 3, 2, 4);
    }

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(-h / 2 + 5, -h / 2, h - 10, h);
    ctx.fillStyle = dark;
    ctx.fillRect(-h / 2 + 7, -h / 2 + 4, h - 14, h - 8);

    // Turret
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, h * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cannon barrel (pointing up = -y direction after rotation)
    ctx.fillStyle = color;
    ctx.fillRect(-2, -h / 2, 4, h * 0.36);
    // Barrel tip
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -h / 2, 4, 3);

    ctx.restore();

    // Armor HP bar for armor-type enemies
    if (!isPlayer && tank.type === 'armor' && tank.hp > 0) {
        const barW = sz;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px, py - 5, barW, 4);
        ctx.fillStyle = '#40a040';
        ctx.fillRect(px, py - 5, barW * (tank.hp / 4), 4);
    }
}

function drawBullet(ctx, b, TILE) {
    const px = b.x * TILE;
    const py = b.y * TILE;
    const r = 3;
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = b.isCPU ? '#ff8080' : '#ffffa0';
    ctx.fillStyle = b.isCPU ? '#ff6060' : '#ffff80';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawExplosion(ctx, exp, TILE) {
    const px = exp.x * TILE;
    const py = exp.y * TILE;
    const elapsed = (Date.now() - exp.id) / 300; // normalized 0-1
    const radius = exp.isBase ? (TILE * 3 * elapsed) : (TILE * 1.5 * elapsed);
    if (elapsed > 1) return;
    ctx.globalAlpha = 1 - elapsed;
    // Outer ring
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    // Inner bright
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawItem(ctx, item, TILE, tick) {
    const def = ITEM_DEFS[item.type];
    if (!def) return;
    const px = item.x * TILE;
    const py = item.y * TILE;
    const sz = item.w * TILE;

    // Flash background
    const flash = Math.floor(tick / 20) % 2 === 0;
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    ctx.strokeStyle = def.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, sz, sz, 4);
    ctx.fill();
    ctx.stroke();

    // Icon
    ctx.font = `${sz * 0.75}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 12;
    ctx.shadowColor = def.glow;
    ctx.fillText(def.icon, px + sz / 2, py + sz / 2);
    ctx.shadowBlur = 0;
}

// ─── Component ───────────────────────────────────────────────────

export default function TankGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode } = location.state || { roomId: 'local', mode: 'single' };

    const canvasRef = useRef(null);
    const tickRef = useRef(0);

    const {
        gameState, players, enemies, bullets, items,
        explosions, map, base, enemiesLeft, myId, localTankRef
    } = useTankLogic(roomId, mode);

    const { playSound } = useTankSounds();
    const lastBulletCount = useRef(0);
    const lastExplosionCount = useRef(0);

    // Play sounds on events
    useEffect(() => {
        if (gameState === 'playing' && bullets.length > lastBulletCount.current) {
            playSound('FIRE');
        }
        lastBulletCount.current = bullets.length;
    }, [bullets.length, gameState]);

    useEffect(() => {
        if (gameState === 'playing' && explosions.length > lastExplosionCount.current) {
            playSound('EXPLOSION');
        }
        lastExplosionCount.current = explosions.length;
    }, [explosions.length, gameState]);

    useEffect(() => {
        if (gameState === 'playing') playSound('START');
    }, [gameState]);

    const myPlayer = players[myId];

    // ── Render Loop ──────────────────────────────────────────────
    const renderRef = useRef();

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const tick = ++tickRef.current;

        // Background
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw border (outer wall of Battle City)
        ctx.fillStyle = '#222233';
        ctx.fillRect(0, 0, CANVAS_W, 2);
        ctx.fillRect(0, CANVAS_H - 2, CANVAS_W, 2);
        ctx.fillRect(0, 0, 2, CANVAS_H);
        ctx.fillRect(CANVAS_W - 2, 0, 2, CANVAS_H);

        // ── Draw Map ──
        if (map && map.length > 0) {
            // Draw non-bush tiles first (bush drawn last to overlap tanks)
            for (let r = 0; r < MAP_ROWS; r++) {
                for (let c = 0; c < MAP_COLS; c++) {
                    const tile = map[r]?.[c];
                    const px = c * TILE;
                    const py = r * TILE;
                    if (tile === 1) drawBrick(ctx, px, py, TILE, TILE);
                    else if (tile === 2) drawSteel(ctx, px, py, TILE, TILE);
                    else if (tile === 3) drawWater(ctx, px, py, TILE, TILE, tick);
                    else if (tile === 5) drawIce(ctx, px, py, TILE, TILE);
                }
            }
        }

        // ── Draw Base (Eagle) ──
        if (base) {
            drawEagle(ctx, base.x * TILE, base.y * TILE, base.w * TILE, base.h * TILE, base.destroyed);
        }

        // ── Draw Items ──
        Object.values(items).forEach(item => drawItem(ctx, item, TILE, tick));

        // ── Draw Bullets ──
        bullets.forEach(b => drawBullet(ctx, b, TILE));

        // ── Draw Enemy Tanks ──
        Object.values(enemies).forEach(tank => {
            if (tank.hp <= 0) return;
            drawTank(ctx, tank, TILE, false, 0, false);
        });

        // ── Draw Player Tanks (use localTank for own position = smooth 60fps) ──
        Object.values(players).forEach(tank => {
            if (tank.hp <= 0) return;
            const isInvuln = tank.invulnerableTime && Date.now() < tank.invulnerableTime;
            // For own tank, use client-predicted position for smooth rendering
            const renderTank = tank.id === myId && localTankRef.current
                ? { ...tank, x: localTankRef.current.x, y: localTankRef.current.y, dir: localTankRef.current.dir }
                : tank;
            drawTank(ctx, renderTank, TILE, true, tank.starLevel || 0, isInvuln);
        });

        // ── Draw Bush over everything (camouflage effect) ──
        if (map && map.length > 0) {
            for (let r = 0; r < MAP_ROWS; r++) {
                for (let c = 0; c < MAP_COLS; c++) {
                    if (map[r]?.[c] === 4) {
                        drawBush(ctx, c * TILE, r * TILE, TILE, TILE);
                    }
                }
            }
        }

        // ── Draw Explosions (on top of everything) ──
        explosions.forEach(exp => drawExplosion(ctx, exp, TILE));

        renderRef.current = requestAnimationFrame(render);
    }, [map, players, enemies, bullets, items, explosions, base]);

    useEffect(() => {
        renderRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(renderRef.current);
    }, [render]);

    // ── HUD helpers ──
    const livesIcons = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => (
        <span key={i} style={{ fontSize: '1rem' }}>🚗</span>
    ));

    const starLabel = ['●', '★', '★★', '★★★'];

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minHeight: '100vh', width: '100%', padding: '0.5rem',
            background: 'radial-gradient(ellipse at 50% 0%, #1a1a2e 0%, #0d0d16 70%)'
        }}>
            {/* ── Title bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                marginBottom: '0.5rem', width: '100%', maxWidth: '1000px'
            }}>
                <button
                    onClick={() => navigate('/tank')}
                    style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#aaa', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                        fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    ◀ Thoát
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontWeight: 900, fontSize: '1.1rem', color: '#ffd700',
                        letterSpacing: '2px', textShadow: '0 0 12px #ffd70088'
                    }}>🎖 TANKS: BATTLE CITY</span>
                    <span style={{
                        fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#888',
                        padding: '2px 8px', borderRadius: '4px'
                    }}>{mode === 'single' ? 'Solo' : 'Multiplayer'}</span>
                </div>
                {/* Enemies remaining */}
                <div style={{
                    background: 'rgba(255,0,0,0.1)', border: '1px solid #ff444466',
                    borderRadius: '8px', padding: '4px 12px', color: '#ff6666',
                    fontSize: '0.85rem', fontWeight: 700
                }}>
                    💀 Quân địch còn lại: <strong>{enemiesLeft}</strong>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%', maxWidth: '1000px' }}>

                {/* ─── LEFT PANEL: Player HUD ─── */}
                <div style={{
                    width: '170px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    {/* Controls */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🎮 Điều Khiển</div>
                        {[['WASD / ←↑→↓', 'Di chuyển'], ['SPACE', 'Bắn đạn']].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <kbd style={{
                                    background: '#1e293b', padding: '2px 6px', borderRadius: '4px',
                                    border: '1px solid #334155', color: '#e2e8f0', fontSize: '0.7rem', whiteSpace: 'nowrap'
                                }}>{k}</kbd>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{v}</span>
                            </div>
                        ))}
                    </div>

                    {/* Map Legend */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🗺 Địa Hình</div>
                        {[
                            ['#b03a14', 'Gạch (phá được)'],
                            ['#6080a0', 'Thép (bất tử)'],
                            ['#1060a0', 'Nước (cản xe)'],
                            ['#1a6020', 'Rừng (ẩn thân)'],
                            ['#a0d8f0', 'Băng (trơn)'],
                        ].map(([c, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 2, background: c, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Items Legend */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🎁 Vật Phẩm</div>
                        {Object.entries(ITEM_DEFS).map(([type, def]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{def.icon}</span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>{
                                    type === 'star' ? 'Nâng cấp súng' :
                                    type === 'grenade' ? 'Diệt sạch quái' :
                                    type === 'helmet' ? 'Bất tử 10s' :
                                    type === 'tank' ? 'Thêm mạng' :
                                    type === 'clock' ? 'Đóng băng' :
                                    'Bọc thép căn cứ'
                                }</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── CENTER: Canvas ─── */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        position: 'relative',
                        border: '3px solid #ffd70033',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 0 30px rgba(255,215,0,0.1), inset 0 0 20px rgba(0,0,0,0.8)',
                        lineHeight: 0,      // Remove inline-block gap
                    }}>
                        {/* Loading overlay */}
                        {(map.length === 0 && gameState === 'waiting') && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 30,
                                background: 'rgba(10,10,20,0.95)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px'
                            }}>
                                <div style={{
                                    width: 50, height: 50, border: '4px solid #ffd700',
                                    borderTopColor: 'transparent', borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                <span style={{ color: '#ffd700', fontWeight: 700, letterSpacing: '2px' }}>ĐANG KẾT NỐI...</span>
                            </div>
                        )}

                        {/* Game Over overlay */}
                        {(gameState === 'finished' || gameState === 'win') && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 40,
                                background: 'rgba(5,5,15,0.92)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '16px', animation: 'fadeIn 0.5s ease'
                            }}>
                                <div style={{
                                    textAlign: 'center', padding: '40px 50px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: `2px solid ${gameState === 'win' ? '#ffd70055' : '#ff444455'}`,
                                    borderRadius: '20px',
                                    boxShadow: `0 0 50px ${gameState === 'win' ? '#ffd70033' : '#ff444433'}`
                                }}>
                                    <div style={{ fontSize: '5rem', marginBottom: '8px' }}>
                                        {gameState === 'win' ? '🏆' : '💥'}
                                    </div>
                                    <h2 style={{
                                        fontSize: '3rem', fontWeight: 900, margin: '0 0 8px 0',
                                        color: gameState === 'win' ? '#ffd700' : '#ff6666',
                                        letterSpacing: '3px',
                                        textShadow: `0 0 20px ${gameState === 'win' ? '#ffd700' : '#ff4444'}`
                                    }}>
                                        {gameState === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
                                    </h2>
                                    <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '28px' }}>
                                        {gameState === 'win'
                                            ? '🎖 Xuất sắc! Bạn đã bảo vệ Căn Cứ thành công!'
                                            : base?.destroyed ? '💀 Căn Cứ Đại Bàng đã bị phá hủy...' : '💀 Bạn đã hết sinh mệnh...'}
                                    </p>
                                    <button
                                        className="btn-primary"
                                        onClick={() => navigate('/tank')}
                                        style={{ padding: '12px 36px', fontSize: '1rem', fontWeight: 700, letterSpacing: '1px' }}
                                    >
                                        QUAY LẠI SẢNH
                                    </button>
                                </div>
                            </div>
                        )}

                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            style={{
                                display: 'block',
                                maxWidth: 'calc(100vw - 420px)',
                                maxHeight: 'calc(100vh - 130px)',
                                imageRendering: 'pixelated',
                            }}
                        />
                    </div>
                </div>

                {/* ─── RIGHT PANEL: Scoreboard / Status ─── */}
                <div style={{
                    width: '170px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    {/* Player status */}
                    {Object.values(players).map(p => (
                        <div key={p.id} style={{
                            background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.id === myId ? 'rgba(74,222,128,0.3)' : 'rgba(96,165,250,0.3)'}`,
                            borderRadius: '10px', padding: '12px'
                        }}>
                            <div style={{
                                fontSize: '0.65rem', color: p.id === myId ? '#4ade80' : '#60a5fa',
                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px'
                            }}>
                                {p.id === myId ? '👤 BẠN' : '👥 ĐỒNG ĐỘI'}
                            </div>
                            {/* Lives */}
                            <div style={{ marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#888' }}>Sinh mệnh: </span>
                                <span style={{ fontSize: '0.85rem' }}>{livesIcons(p.lives)}</span>
                            </div>
                            {/* Stars */}
                            <div style={{ marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#888' }}>Cấp súng: </span>
                                <span style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {starLabel[p.starLevel || 0]}
                                </span>
                            </div>
                            {/* Invulnerable indicator */}
                            {p.invulnerableTime && Date.now() < p.invulnerableTime && (
                                <div style={{ color: '#44aaff', fontSize: '0.72rem', marginTop: '4px' }}>
                                    ⛑️ Bất tử!
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Enemy count summary */}
                    <div style={{
                        background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.2)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#ff8888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                            💀 Kẻ Thù
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ddd', marginBottom: '4px' }}>
                            Trên sân: <strong style={{ color: '#ff6666' }}>{Object.values(enemies).filter(e => e.hp > 0).length}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ddd' }}>
                            Còn lại: <strong style={{ color: '#ff9966' }}>{enemiesLeft}</strong>
                        </div>
                    </div>

                    {/* Enemy type legend */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>☠️ Loại Địch</div>
                        {Object.entries(ENEMY_COLORS).map(([type, color]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                                    {type === 'basic' ? 'Cơ bản' : type === 'fast' ? 'Tốc độ' : type === 'power' ? 'Hỏa lực' : 'Bọc thép'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Game status */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px', padding: '12px'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>📡 Trạng Thái</div>
                        <div style={{
                            display: 'inline-block', padding: '4px 10px', borderRadius: '20px',
                            fontSize: '0.72rem', fontWeight: 700,
                            background: gameState === 'playing' ? 'rgba(74,222,128,0.1)' : gameState === 'win' ? 'rgba(255,215,0,0.1)' : 'rgba(239,68,68,0.1)',
                            color: gameState === 'playing' ? '#4ade80' : gameState === 'win' ? '#ffd700' : '#ef4444',
                        }}>
                            {gameState === 'playing' ? '⚔️ Đang Đánh' : gameState === 'win' ? '🏆 Chiến Thắng' : gameState === 'finished' ? '💀 Thất Bại' : '⏳ Chờ...'}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}
