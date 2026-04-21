import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Volume2, VolumeX } from 'lucide-react';
import { socket } from '../../utils/socket';
import { INITIAL_SPEED, DASH_COOLDOWN } from './snakeAI';
import { useSnakeLogic } from './useSnakeLogic';
import { useBgMusic } from '../../hooks/useBgMusic';

// ─── CANVAS ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function drawEyes(ctx, cx, cy, cell, dir, color) {
    const o = cell * 0.22;
    let e1, e2;
    if (dir.x === 1) { e1 = { x: cx + o, y: cy - o }; e2 = { x: cx + o, y: cy + o }; }
    else if (dir.x === -1) { e1 = { x: cx - o, y: cy - o }; e2 = { x: cx - o, y: cy + o }; }
    else if (dir.y === -1) { e1 = { x: cx - o, y: cy - o }; e2 = { x: cx + o, y: cy - o }; }
    else { e1 = { x: cx - o, y: cy + o }; e2 = { x: cx + o, y: cy + o }; }
    const r = cell * 0.12;
    ctx.fillStyle = color || '#000';
    ctx.beginPath(); ctx.arc(e1.x, e1.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2.x, e2.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e1.x + r * 0.3, e1.y - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2.x + r * 0.3, e2.y - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
}

function SnakeCanvas({ gameRef, mapSize }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const draw = (ts) => {
            rafRef.current = requestAnimationFrame(draw);
            const ctx = canvas.getContext('2d');
            const sz = canvas.width;
            const cell = sz / mapSize;
            ctx.clearRect(0, 0, sz, sz);
            ctx.fillStyle = '#1a1f2e'; ctx.fillRect(0, 0, sz, sz);
            ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5;
            for (let i = 0; i <= mapSize; i++) {
                ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, sz); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(sz, i * cell); ctx.stroke();
            }
            const g = gameRef.current;
            if (!g) return;
            const now = performance.now();
            const elapsed = now - g.lastTickTime;
            const t = Math.min(elapsed / (g.currentSpeed || INITIAL_SPEED), 1);

            if (g.blockedCells && g.blockedCells.size) {
                ctx.fillStyle = 'rgba(40,40,55,0.85)';
                for (const k of g.blockedCells) {
                    const [bx, by] = k.split(',').map(Number);
                    roundRect(ctx, bx * cell + 0.5, by * cell + 0.5, cell - 1, cell - 1, 2); ctx.fill();
                }
                ctx.strokeStyle = 'rgba(100,100,130,0.4)'; ctx.lineWidth = 0.8;
                for (const k of g.blockedCells) {
                    const [bx, by] = k.split(',').map(Number);
                    ctx.beginPath(); ctx.moveTo(bx * cell + 2, by * cell + 2); ctx.lineTo((bx + 1) * cell - 2, (by + 1) * cell - 2);
                    ctx.moveTo((bx + 1) * cell - 2, by * cell + 2); ctx.lineTo(bx * cell + 2, (by + 1) * cell - 2); ctx.stroke();
                }
            }
            ctx.fillStyle = '#3f3f46';
            for (const b of g.deadBodies) {
                roundRect(ctx, b.x * cell + 1, b.y * cell + 1, cell - 2, cell - 2, 3); ctx.fill();
            }
            if (g.item) {
                const p = 0.78 + 0.08 * Math.sin(ts / 300);
                const cx = g.item.x * cell + cell / 2, cy = g.item.y * cell + cell / 2;
                const gr = ctx.createRadialGradient(cx, cy, cell * 0.1, cx, cy, cell / 2 * p);
                gr.addColorStop(0, '#f87171'); gr.addColorStop(1, '#dc2626');
                ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10;
                ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, cell / 2 * p, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }
            if (g.goldenItem) {
                const p2 = 0.85 + 0.1 * Math.sin(ts / 200);
                const cx = g.goldenItem.x * cell + cell / 2, cy = g.goldenItem.y * cell + cell / 2;
                ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 18;
                ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, cy, cell / 2 * p2, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                if (g.goldenItem.timeLeft !== undefined) {
                    ctx.fillStyle = '#fbbf24'; ctx.font = `bold ${Math.max(9, cell * 0.55)}px sans-serif`;
                    ctx.textAlign = 'center';
                    const yOffset = g.goldenItem.y === 0 ? (cell / 2 * p2 + cell * 0.7) : (-cell / 2 * p2 - 3);
                    ctx.fillText(`⏳${g.goldenItem.timeLeft}`, cx, cy + yOffset);
                }
            }
            for (const s of g.snakes) {
                if (!s.positions || !s.positions.length) continue;
                const a = s.isDead ? 0.25 : 1;
                for (let i = s.positions.length - 1; i >= 0; i--) {
                    const seg = s.positions[i], isHead = i === 0;
                    let dx = seg.x * cell, dy = seg.y * cell;
                    
                    if (s.prevPositions && s.prevPositions[i] && !s.isDead) {
                        const prevSeg = s.prevPositions[i];
                        const ddx = seg.x - prevSeg.x, ddy = seg.y - prevSeg.y;
                        if (Math.abs(ddx) <= 1 && Math.abs(ddy) <= 1) { 
                            dx = (prevSeg.x + ddx * t) * cell; 
                            dy = (prevSeg.y + ddy * t) * cell; 
                        }
                    }
                    
                    if (isHead) {
                        const isDashing = s.dashFlashEnd && now < s.dashFlashEnd;
                        ctx.shadowColor = s.color; ctx.shadowBlur = isDashing ? 25 : 12;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath(); ctx.arc(dx + cell / 2, dy + cell / 2, cell * (isDashing ? 0.5 : 0.45), 0, Math.PI * 2); ctx.fill();
                        ctx.shadowBlur = 0;
                        if (isDashing) {
                            ctx.strokeStyle = s.color; ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(dx + cell / 2, dy + cell / 2, cell * 0.55, 0, Math.PI * 2); ctx.stroke();
                        }
                        const visualDir = s.isMe && s.nextDir ? s.nextDir : (s.direction || { x: 1, y: 0 });
                        drawEyes(ctx, dx + cell / 2, dy + cell / 2, cell, visualDir, s.color);
                    } else {
                        const len = s.positions.length;
                        const fs = len >= 8 ? 0.25 : (len >= 4 ? 0.1 : 0);
                        const ff = 1 - (i / Math.max(len, 8)) * fs;
                        ctx.globalAlpha = a * ff; ctx.fillStyle = s.color;
                        roundRect(ctx, dx + 1, dy + 1, cell - 2, cell - 2, Math.max(2, cell * 0.25)); ctx.fill();
                        ctx.globalAlpha = a;
                    }
                }
            }
            ctx.globalAlpha = 1;
        };
        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [mapSize, gameRef]);

    return <canvas ref={canvasRef} width={600} height={600} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />;
}

// ─── LEFT PANEL ──────────────────────────────────────────────────────────────
function LeftPanel({ gameRef, gameOver, accentColor, resultEmoji, resultTitle, resultDetail }) {
    const [cdRemain, setCdRemain] = useState(0);
    useEffect(() => {
        const t = setInterval(() => {
            const g = gameRef.current;
            if (!g) return;
            const end = g.dashCooldownEnd || 0;
            setCdRemain(Math.max(0, end - performance.now()));
        }, 100);
        return () => clearInterval(t);
    }, [gameRef]);

    const score = gameRef.current?.score || 0;
    const ready = cdRemain <= 0;
    const hasPoints = score >= 5;
    const canDash = ready && hasPoints;

    const pct = ready ? 1 : 1 - cdRemain / DASH_COOLDOWN;
    const cardStyle = { borderRadius: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px' };
    const labelStyle = { fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' };
    const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '5px', lineHeight: 1.4 };
    const kbdStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: '5px', padding: '2px 7px', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 };

    return (
        <div style={{ width: '240px', flexShrink: 0, paddingRight: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...cardStyle, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <div style={{ ...labelStyle, color: '#60a5fa' }}>🎮 Điều Khiển</div>
                <div style={rowStyle}>
                    <kbd style={kbdStyle}>W</kbd><kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>S</kbd><kbd style={kbdStyle}>D</kbd>
                    <span style={{ marginLeft: '4px' }}>Di chuyển</span>
                </div>
                <div style={{ ...rowStyle, marginTop: '8px' }}>
                    <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd><kbd style={kbdStyle}>←</kbd><kbd style={kbdStyle}>→</kbd>
                    <span style={{ marginLeft: '4px' }}>Di chuyển</span>
                </div>
                <div style={{
                    ...rowStyle, background: 'rgba(250,204,21,0.06)', borderRadius: '8px', padding: '8px 10px', marginTop: '10px',
                    border: `1px solid ${canDash ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.3s'
                }}>
                    <kbd style={{ ...kbdStyle, background: canDash ? 'rgba(250,204,21,0.15)' : '#1e293b', color: canDash ? '#fbbf24' : '#64748b', border: `1px solid ${canDash ? '#fbbf24' : '#334155'}`, fontSize: '0.82rem', opacity: hasPoints ? 1 : 0.5 }}>SPACE</kbd>
                    <div>
                        <div style={{ color: canDash ? '#fbbf24' : (ready ? '#94a3b8' : '#cbd5e1'), fontWeight: 700 }}>Lao Nhanh</div>
                        <div style={{ fontSize: '0.74rem', color: canDash ? '#fbbf24' : '#64748b', marginTop: '1px' }}>
                            {!ready ? `Hồi chiêu ${(cdRemain / 1000).toFixed(1)}s` : (!hasPoints ? `Cần 5 điểm (có ${score})` : '✓ Sẵn sàng!')}
                        </div>
                    </div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '6px', height: '5px', overflow: 'hidden', marginTop: '8px' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: canDash ? 'linear-gradient(90deg,#4ade80,#22c55e)' : (ready ? '#334155' : 'linear-gradient(90deg,#f59e0b,#fbbf24)'), borderRadius: '6px', transition: 'width 0.15s' }} />
                </div>
            </div>
            <div style={cardStyle}>
                <div style={labelStyle}>⚡ Cơ Chế Lao Nhanh</div>
                <div style={rowStyle}><span style={{ color: '#fbbf24', flexShrink: 0 }}>➤</span>Lao 3 ô về phía trước</div>
                <div style={rowStyle}><span style={{ color: '#f87171', flexShrink: 0 }}>☠</span>Bỏ đuôi → hóa đá chắn đường</div>
                <div style={rowStyle}><span style={{ color: '#f87171', flexShrink: 0 }}>−</span>Reset điểm về 2</div>
                <div style={rowStyle}><span style={{ color: '#94a3b8', flexShrink: 0 }}>!</span>Cần ≥ <b style={{ color: '#fff', margin: '0 3px' }}>5</b> điểm</div>
                <div style={rowStyle}><span style={{ color: '#60a5fa', flexShrink: 0 }}>⏱</span>Hồi chiêu <b style={{ color: '#fff', margin: '0 3px' }}>3s</b> hồi chiêu</div>
            </div>
            {gameOver && (
                <div style={{ marginTop: 'auto', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${accentColor}66`, background: `linear-gradient(160deg, ${accentColor}18 0%, rgba(10,14,22,0.9) 100%)`, boxShadow: `0 0 24px ${accentColor}22` }}>
                    <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
                    <div style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '8px', filter: `drop-shadow(0 0 14px ${accentColor})` }}>{resultEmoji}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: accentColor, letterSpacing: '0.02em', textShadow: `0 0 16px ${accentColor}88`, marginBottom: '4px' }}>{resultTitle}</div>
                        {resultDetail && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>{resultDetail}</div>}
                    </div>
                    <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)` }} />
                </div>
            )}
        </div>
    );
}

// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
function RightPanel({ mode, gameOver, handleRestart, navigate, playerColor, muted, toggleMute }) {
    const cardStyle = { borderRadius: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px' };
    const labelStyle = { fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' };
    const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', lineHeight: 1.4 };

    return (
        <div style={{ width: '240px', flexShrink: 0, paddingLeft: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={cardStyle}>
                <div style={labelStyle}>🎯 Vật Phẩm</div>
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle,#f87171,#dc2626)', boxShadow: '0 0 6px #f87171', flexShrink: 0 }} />
                        <span style={{ color: '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>Mồi Đỏ +1 điểm</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Rắn dài thêm 1 đốt</div>
                </div>
                <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle,#fbbf24,#d97706)', boxShadow: '0 0 8px #fbbf24', flexShrink: 0 }} />
                        <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>Mồi Vàng +2 điểm</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.6 }}>✂ Rút ngắn 2 đốt<br />⏳Biến mất sau 5s<br />🐢Đi chậm lại</div>
                </div>
            </div>
            <div style={cardStyle}>
                <div style={labelStyle}>🗺 Ký Hiệu</div>
                <div style={rowStyle}><div style={{ width: 14, height: 14, background: '#3f3f46', borderRadius: '3px', flexShrink: 0, marginTop: '2px' }} /><span>Xác rắn — chướng ngại</span></div>
                <div style={rowStyle}><div style={{ width: 14, height: 14, background: 'rgba(40,40,55,0.9)', borderRadius: '3px', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '9px', color: 'rgba(120,120,150,0.9)', lineHeight: 1, fontWeight: 700 }}>✕</span></div><span>Ô cô lập — không có mồi</span></div>
                <div style={rowStyle}><div style={{ width: 14, height: 14, background: playerColor === 'blue' ? '#60a5fa' : '#4ade80', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }} /><span>Rắn của bạn</span></div>
                <div style={rowStyle}><div style={{ width: 14, height: 14, background: playerColor === 'blue' ? '#4ade80' : '#60a5fa', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }} /><span>{mode === 'solo' ? 'Rắn CPU' : 'Rắn đối thủ'}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '2px' }}>
                {mode === 'solo' && (
                    <button className={gameOver ? 'btn-primary' : 'btn-secondary'} onClick={handleRestart} style={{ width: '100%', padding: '9px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.9rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><RotateCcw size={15} /> Chơi lại</div>
                        {gameOver && <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400 }}>(Phím Space)</span>}
                    </button>
                )}
                <button onClick={toggleMute} style={{ width: '100%', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: muted ? '#ef4444' : '#4ade80', cursor: 'pointer' }}>
                    {muted ? <VolumeX size={15} /> : <Volume2 size={15} />} {muted ? 'Bật nhạc' : 'Tắt nhạc'}
                </button>
                <button className="btn-secondary" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ width: '100%', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '0.9rem' }}>
                    <ArrowLeft size={15} /> Thoát
                </button>
            </div>
        </div>
    );
}

// ─── MAIN GAME ───────────────────────────────────────────────────────────────
export default function SnakeGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, mapSize, roomId, playerColor, difficulty, hasBot } =
        location.state || { mode: 'solo', mapSize: 20, roomId: null, difficulty: 'Medium', hasBot: false };
        
    const { gameRef, uiState, gameState, countdown, handleRestart } = useSnakeLogic(mode, mapSize, roomId, hasBot, difficulty);

    const { muted, toggleMute } = useBgMusic('/audio/snake_bg.ogg', !uiState.gameOver, 0.28);

    const myColor = playerColor === 'green' ? '#4ade80' : '#60a5fa';
    const myColorLabel = playerColor === 'green' ? 'Xanh' : 'Lam';

    // Multiplayer canvas data
    const mpRef = useRef(null);
    if (mode === 'multiplayer' && gameState) {
        mpRef.current = {
            snakes: Object.values(gameState.snakes).map(s => {
                const isMe = s.id === socket.id;
                const oldS = mpRef.current?.snakes?.find(os => os.id === s.id);
                return {
                    id: s.id, positions: s.positions, prevPositions: oldS ? oldS.positions : s.positions,
                    color: s.color === 'green' ? '#4ade80' : '#60a5fa',
                    direction: s.direction || { x: 1, y: 0 }, isDead: s.isDead,
                    nextDir: s.nextDir, isMe, dashFlashEnd: s.dashFlashEnd,
                };
            }),
            deadBodies: gameState.deadBodies || [],
            item: gameState.item || { x: -10, y: -10 }, goldenItem: gameState.goldenItem || null,
            blockedCells: new Set(), currentSpeed: INITIAL_SPEED,
            lastTickTime: performance.now(),
            dashCooldownEnd: gameState.snakes[socket.id]?.dashCooldownEnd || 0,
            score: gameState.snakes[socket.id]?.score || 0
        };
    }
    const canvasRef2use = mode === 'multiplayer' ? mpRef : gameRef;
    const oppScore = mode === 'solo' ? uiState.botScore : (gameState ? Object.values(gameState.snakes).find(s => s.id !== socket.id)?.score ?? 0 : 0);

    const isWin = uiState.statusMessage.includes('THẮNG') || uiState.statusMessage.includes('Thắng');
    const isDraw = uiState.statusMessage.includes('HÒA') || uiState.statusMessage.includes('Hòa');
    const accentColor = isWin ? '#4ade80' : isDraw ? '#fbbf24' : '#f87171';
    const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : '💀';
    const resultTitle = uiState.statusMessage.split('!')[0] + '!';
    const resultDetail = uiState.statusMessage.includes('(') ? uiState.statusMessage.split('(')[1]?.replace(')', '') : uiState.statusMessage.split('!').slice(1).join('!').trim();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 0.5rem' }}>
            <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '1050px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '8px 14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={16} color="var(--primary-color)" />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Snake {mapSize}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{mode === 'solo' ? `· vs CPU (${difficulty})` : `· ${roomId}`}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trophy size={16} color="#fbbf24" /><span style={{ fontWeight: 800, fontSize: '1rem' }}>Bạn: <span style={{ color: '#4ade80' }}>{uiState.score}</span></span></div>
                        {(hasBot || mode === 'multiplayer') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 11, height: 11, borderRadius: '50%', background: '#60a5fa' }} /><span style={{ fontWeight: 800, fontSize: '1rem' }}>{mode === 'solo' ? `CPU (${difficulty})` : 'Địch'}: <span style={{ color: '#60a5fa' }}>{oppScore}</span></span></div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {hasBot && gameRef.current?.botDead && !uiState.gameOver ? <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>💀 CPU đã chết — tiếp tục ghi điểm!</span> : <span style={{ fontSize: '0.82rem', fontWeight: 700, color: uiState.gameOver ? accentColor : 'var(--text-secondary)' }}>{uiState.gameOver ? `${resultEmoji} ${resultTitle}` : 'Đang chơi...'}</span>}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
                    <LeftPanel gameRef={canvasRef2use} gameOver={uiState.gameOver} accentColor={accentColor} resultEmoji={resultEmoji} resultTitle={resultTitle} resultDetail={resultDetail} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '4px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5),0 10px 30px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <SnakeCanvas gameRef={canvasRef2use} mapSize={mapSize} />

                            {mode === 'multiplayer' && countdown !== null && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 60, gap: '16px' }}>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Rắn của bạn:</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: myColor, boxShadow: `0 0 10px ${myColor}` }} /><span style={{ fontWeight: 700, fontSize: '1.2rem', color: myColor }}>{myColorLabel}</span></div>
                                    <div style={{ fontSize: countdown === 0 ? '2.5rem' : '6rem', fontWeight: 900, color: countdown === 0 ? '#4ade80' : '#fff', textShadow: '0 0 20px currentColor', transition: 'all 0.3s' }}>{countdown === 0 ? 'BẮT ĐẦU!' : countdown}</div>
                                </div>
                            )}

                            {uiState.gameOver && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,14,22,0.42)', zIndex: 5, pointerEvents: 'none', borderRadius: '4px' }} />}
                        </div>
                    </div>

                    <RightPanel mode={mode} gameOver={uiState.gameOver} handleRestart={handleRestart} navigate={navigate} playerColor={playerColor} muted={muted} toggleMute={toggleMute} />
                </div>
            </div>
        </div>
    );
}
