import React, { useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTankLogic } from './useTankLogic';
import { useTankSounds } from '../../hooks/useTankSounds';
import { Swords, Trophy, Activity, ArrowLeft, RotateCcw, Shield, Star, Info, Target, History } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────
const MAP_COLS = 26;
const MAP_ROWS = 26;
const TILE = 24; // pixels per grid cell
const CANVAS_W = MAP_COLS * TILE; // 624
const CANVAS_H = MAP_ROWS * TILE; // 624

// Tile types: 0=empty 1=brick 2=steel 3=water 4=bush 5=ice 6=base
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

const ENEMY_COLORS = {
    basic: '#c8c8c8',
    fast:  '#e0b010',
    power: '#d03030',
    armor: '#40a040',
};

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
    ctx.fillStyle = mortar;
    ctx.fillRect(x, y + Math.floor(h * 0.5), w, 1);
    ctx.fillRect(x, y, 1, h);
    const hw = Math.floor(w / 2);
    ctx.fillRect(x + hw, y, 1, Math.floor(h * 0.5));
    ctx.fillRect(x, y + Math.floor(h * 0.5), hw, 1);
    ctx.fillRect(x + hw, y + Math.floor(h * 0.5) + 1, w - hw, Math.floor(h * 0.5));
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
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = destroyed ? '#442200' : '#1a1a2e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = destroyed ? '#662200' : '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
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
    if (invulnerable && Math.floor(Date.now() / 150) % 2 === 0) return;
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
    ctx.fillStyle = '#333';
    ctx.fillRect(-h / 2, -h / 2, 4, h);
    ctx.fillRect(h / 2 - 4, -h / 2, 4, h);
    ctx.fillStyle = '#555';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-h / 2 + 1, -h / 2 + 4 + i * (h - 8) / 3, 2, 4);
        ctx.fillRect(h / 2 - 3, -h / 2 + 4 + i * (h - 8) / 3, 2, 4);
    }
    ctx.fillStyle = color;
    ctx.fillRect(-h / 2 + 5, -h / 2, h - 10, h);
    ctx.fillStyle = dark;
    ctx.fillRect(-h / 2 + 7, -h / 2 + 4, h - 14, h - 8);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, h * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-2, -h / 2, 4, h * 0.36);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -h / 2, 4, 3);
    ctx.restore();
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
    const elapsed = (Date.now() - exp.id) / 300;
    const radius = exp.isBase ? (TILE * 3 * elapsed) : (TILE * 1.5 * elapsed);
    if (elapsed > 1) return;
    ctx.globalAlpha = 1 - elapsed;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
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
    const flash = Math.floor(tick / 20) % 2 === 0;
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)';
    ctx.strokeStyle = def.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, sz, sz, 4);
    ctx.fill();
    ctx.stroke();
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
    const { roomId, mode, level = 1 } = location.state || { roomId: 'local', mode: 'single', level: 1 };

    const canvasRef = useRef(null);
    const tickRef = useRef(0);

    const {
        gameState, players, enemies, bullets, items,
        explosions, map, base, enemiesLeft, myId, localTankRef, level: currentLevel, maxLevel
    } = useTankLogic(roomId, mode, level);

    const { playSound } = useTankSounds();
    const lastBulletCount = useRef(0);
    const lastExplosionCount = useRef(0);

    // Play sounds on events
    useEffect(() => {
        if (gameState === 'playing' && bullets.length > lastBulletCount.current) {
            playSound('FIRE');
        }
        lastBulletCount.current = bullets.length;
    }, [bullets.length, gameState, playSound]);

    useEffect(() => {
        if (gameState === 'playing' && explosions.length > lastExplosionCount.current) {
            playSound('EXPLOSION');
        }
        lastExplosionCount.current = explosions.length;
    }, [explosions.length, gameState, playSound]);

    useEffect(() => {
        if (gameState === 'playing') playSound('START');
    }, [gameState, playSound]);

    const myPlayer = players[myId];

    // ── Render Loop ──────────────────────────────────────────────
    const renderRef = useRef();

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const tick = ++tickRef.current;
        ctx.fillStyle = PALETTE.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#222233';
        ctx.fillRect(0, 0, CANVAS_W, 2);
        ctx.fillRect(0, CANVAS_H - 2, CANVAS_W, 2);
        ctx.fillRect(0, 0, 2, CANVAS_H);
        ctx.fillRect(CANVAS_W - 2, 0, 2, CANVAS_H);

        if (map && map.length > 0) {
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
        if (base) drawEagle(ctx, base.x * TILE, base.y * TILE, base.w * TILE, base.h * TILE, base.destroyed);
        Object.values(items).forEach(item => drawItem(ctx, item, TILE, tick));
        bullets.forEach(b => drawBullet(ctx, b, TILE));
        Object.values(enemies).forEach(tank => {
            if (tank.hp <= 0) return;
            drawTank(ctx, tank, TILE, false, 0, false);
        });
        Object.values(players).forEach(tank => {
            if (tank.hp <= 0) return;
            const isInvuln = tank.invulnerableTime && Date.now() < tank.invulnerableTime;
            const renderTank = tank.id === myId && localTankRef.current
                ? { ...tank, x: localTankRef.current.x, y: localTankRef.current.y, dir: localTankRef.current.dir }
                : tank;
            drawTank(ctx, renderTank, TILE, true, tank.starLevel || 0, isInvuln);
        });
        if (map && map.length > 0) {
            for (let r = 0; r < MAP_ROWS; r++) {
                for (let c = 0; c < MAP_COLS; c++) {
                    if (map[r]?.[c] === 4) drawBush(ctx, c * TILE, r * TILE, TILE, TILE);
                }
            }
        }
        explosions.forEach(exp => drawExplosion(ctx, exp, TILE));
        renderRef.current = requestAnimationFrame(render);
    }, [map, players, enemies, bullets, items, explosions, base, myId, localTankRef]);

    useEffect(() => {
        renderRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(renderRef.current);
    }, [render]);

    const livesIcons = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => (
        <span key={i} style={{ fontSize: '1rem' }}>🛡️</span>
    ));

    const starLabel = ['●', '★', '★★', '★★★'];

    return (
        <div className="full-page-mobile-scroll" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            width: '100vw', minHeight: '100vh', padding: '0.5rem',
            background: 'radial-gradient(circle at center, #1a1a2e 0%, #05050a 100%)',
            overflowY: 'auto', boxSizing: 'border-box'
        }}>
            <div style={{
                position: 'relative', display: 'flex', flexWrap: 'wrap',
                padding: '1.2rem', gap: '1.5rem', alignItems: 'stretch', justifyContent: 'center',
                height: 'fit-content', maxHeight: '96vh', width: 'max-content', maxWidth: '98%',
                borderRadius: '20px', background: 'rgba(23, 23, 33, 0.85)', backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}>
                {/* LEFT: Info/Controls */}
                <div style={{ flex: '1 1 240px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>TANKS</h1>
                        <div style={{ color: '#ffd700', fontSize: '0.7rem', fontWeight: 800 }}>BATTLE CITY CLONE</div>
                    </div>
                    
                    <button className="btn-secondary" onClick={() => navigate('/tank')} style={{
                        padding: '10px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                        <ArrowLeft size={18} /> THOÁT
                    </button>

                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '10px' }}>🕹 ĐIỀU KHIỂN</div>
                        <div style={{ fontSize: '0.8rem', color: '#ddd', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Di chuyển:</span> <span>WASD / Arrow</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Bắn:</span> <span>SPACE</span></div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, marginBottom: '10px' }}>🗺 ĐỊA HÌNH</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[['#b03a14', 'Gạch'], ['#6080a0', 'Thép'], ['#1060a0', 'Nước'], ['#1a6020', 'Cây']].map(([c, l]) => (
                                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '5px 8px', borderRadius: '8px' }}>
                                    <div style={{ width: 10, height: 10, background: c, borderRadius: '2px' }} />
                                    <span style={{ fontSize: '0.7rem' }}>{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER: Canvas */}
                <div style={{ flex: '2 1 624px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        position: 'relative', border: '5px solid rgba(255,215,0,0.1)', borderRadius: '15px',
                        overflow: 'hidden', boxShadow: '0 0 50px rgba(0,0,0,0.9)', width: '100%', maxWidth: '624px', aspectRatio: '1/1'
                    }}>
                        {gameState === 'waiting' && map.length === 0 && (
                            <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#ffd700' }}>
                                LOADING...
                            </div>
                        )}
                        {(gameState === 'finished' || gameState === 'win') && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${gameState === 'win' ? 'rgba(255,215,0,0.4)' : 'rgba(239,68,68,0.4)'}`, boxShadow: gameState === 'win' ? '0 0 40px rgba(255,215,0,0.3)' : '0 0 40px rgba(239,68,68,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <h1 style={{ color: gameState === 'win' ? '#ffd700' : '#ff4444', fontSize: '2rem', margin: 0, fontWeight: 900 }}>{gameState === 'win' ? 'CHIẾN THẮNG!' : 'THUA'}</h1>
                                    {gameState === 'win' && currentLevel >= maxLevel && (
                                        <p style={{ color: '#fbbf24', fontSize: '1rem', marginTop: '4px' }}>Tất cả {maxLevel} màn!</p>
                                    )}
                                    {gameState === 'win' && currentLevel < maxLevel && (
                                        <p style={{ color: '#60a5fa', fontSize: '1rem', marginTop: '4px' }}>Màn {currentLevel}</p>
                                    )}
                                    <button onClick={() => navigate('/tank')} style={{ marginTop: '8px', padding: '12px 32px', fontSize: '1rem', fontWeight: 700, background: gameState === 'win' ? '#ffd700' : '#ef4444', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                                        THOÁT
                                    </button>
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: '100%', height: '100%', imageRendering: 'pixelated', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* RIGHT: Status */}
                <div style={{ flex: '1 1 240px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ background: 'linear-gradient(180deg, rgba(74,222,128,0.1), transparent)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 800, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={16} /> TRẠNG THÁI
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>Màn:</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fbbf24' }}>{currentLevel} / {maxLevel}</div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>Sinh mệnh:</div>
                            <div>{livesIcons(myPlayer?.lives || 0)}</div>
                        </div>
                         <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>Địch còn lại:</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff4444' }}>{enemiesLeft}</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '15px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, marginBottom: '10px' }}>📡 KẾT NỐI</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                            <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>Máy chủ trực tuyến</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .game-container { animation: fadeIn 0.4s ease-out; }
                .btn-primary { background: #ffd700; color: #000; padding: 12px 30px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: 0.3s; }
                .btn-primary:hover { transform: scale(1.1); background: #fff; }
            `}</style>
        </div>
    );
}
