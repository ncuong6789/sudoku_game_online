import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Activity, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import { socket } from '../../utils/socket';
import { INITIAL_SPEED, DASH_COOLDOWN } from './snakeAI';
import { useSnakeLogic } from './useSnakeLogic';
import { useBgMusic } from '../../hooks/useBgMusic';
import { useTranslation } from 'react-i18next';

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
function LeftPanel({ gameRef, gameOver, accentColor, resultEmoji, resultTitle, resultDetail, t }) {
    const [cdRemain, setCdRemain] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            const g = gameRef.current;
            if (!g) return;
            const end = g.dashCooldownEnd || 0;
            setCdRemain(Math.max(0, end - performance.now()));
        }, 100);
        return () => clearInterval(timer);
    }, [gameRef]);

    const score = gameRef.current?.score || 0;
    const ready = cdRemain <= 0;
    const hasPoints = score >= 5;
    const canDash = ready && hasPoints;
    const pct = ready ? 1 : 1 - cdRemain / DASH_COOLDOWN;

    return (
        <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Controls */}
            <div className="gp-card" style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.2)', marginBottom: '8px' }}>
                <div className="gp-label" style={{ color: '#60a5fa' }}>🎮 {t('snake.controls')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {['W','A','S','D','↑','↓','←','→'].map(k => <kbd key={k} className="gp-kbd">{k}</kbd>)}
                    <span className="gp-caption" style={{ marginLeft: '4px' }}>{t('snake.move')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(250,204,21,0.06)', borderRadius: '6px', padding: '6px 8px', border: `1px solid ${canDash ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                    <kbd className="gp-kbd" style={{ color: canDash ? '#fbbf24' : '#64748b', border: `1px solid ${canDash ? '#fbbf24' : '#334155'}` }}>SPC</kbd>
                    <div style={{ flex: 1 }}>
                        <div className="gp-ui" style={{ color: canDash ? '#fbbf24' : '#94a3b8' }}>{t('snake.dash')}</div>
                        <div className="gp-caption">
                            {!ready ? `⏳${(cdRemain/1000).toFixed(1)}s` : !hasPoints ? '≥5pts' : '✓'}
                        </div>
                    </div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '3px', height: '3px', overflow: 'hidden', marginTop: '5px' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: canDash ? '#4ade80' : '#f59e0b', borderRadius: '3px', transition: 'width 0.15s' }} />
                </div>
            </div>
            
            {/* Dash tips - 2-col grid */}
            <div className="gp-card" style={{ marginBottom: '8px' }}>
                <div className="gp-label">⚡ Dash</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px' }}>
                    {[
                        ['➤','#fbbf24', t('snake.move3')],
                        ['☠','#f87171', t('snake.tailTrap')],
                        ['−','#f87171', t('snake.resetScore')],
                        ['⏱','#60a5fa', t('snake.cooldown')],
                    ].map(([icon, color, text], i) => (
                        <div key={i} className="gp-caption" style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ color, flexShrink: 0 }}>{icon}</span><span>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {gameOver && (
                <div style={{ marginTop: 'auto', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${accentColor}55`, background: `linear-gradient(160deg, ${accentColor}12 0%, rgba(10,14,22,0.9) 100%)` }}>
                    <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
                    <div style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-hero)', lineHeight: 1, marginBottom: '5px' }}>{resultEmoji}</div>
                        <div className="gp-title" style={{ color: accentColor }}>{resultTitle}</div>
                        {resultDetail && <div className="gp-caption" style={{ marginTop: '4px' }}>{resultDetail}</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
function RightPanel({ mode, gameOver, handleRestart, navigate, playerColor, muted, toggleMute, t, zoomLevel, handleZoomIn, handleZoomOut }) {
    const myC = playerColor === 'blue' ? '#60a5fa' : '#4ade80';
    const oppC = playerColor === 'blue' ? '#4ade80' : '#60a5fa';

    return (
        <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Items - compact 2-col */}
            <div className="gp-card" style={{ marginBottom: '8px' }}>
                <div className="gp-label">🎯 {t('snake.items')}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', borderRadius: '7px', padding: '7px 8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 5px #f87171', flexShrink: 0 }} />
                            <span className="gp-ui" style={{ color: '#f87171' }}>{t('snake.redBait')}</span>
                        </div>
                        <div className="gp-caption">{t('snake.redDesc')}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(251,191,36,0.08)', borderRadius: '7px', padding: '7px 8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', boxShadow: '0 0 6px #fbbf24', flexShrink: 0 }} />
                            <span className="gp-ui" style={{ color: '#fbbf24' }}>{t('snake.goldBait')}</span>
                        </div>
                        <div className="gp-caption">{t('snake.shorten')} · {t('snake.slow')}</div>
                    </div>
                </div>
            </div>
            
            {/* Legend - 2x2 grid */}
            <div className="gp-card" style={{ marginBottom: '12px' }}>
                <div className="gp-label">🗺 {t('snake.legend')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    {[
                        { dot: { width:12, height:12, borderRadius:'50%', background: myC, flexShrink:0 }, label: t('snake.yourSnake') },
                        { dot: { width:12, height:12, borderRadius:'50%', background: oppC, flexShrink:0 }, label: mode === 'solo' ? t('snake.cpuSnake') : t('snake.enemySnake') },
                        { dot: { width:12, height:12, borderRadius:'3px', background:'#3f3f46', flexShrink:0 }, label: t('snake.deadSnake') },
                        { dot: { width:12, height:12, borderRadius:'3px', background:'rgba(40,40,55,0.9)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', color:'rgba(150,150,180,0.9)', fontWeight:700 }, label: t('snake.isolated'), inner:'✕' },
                    ].map((item, i) => (
                        <div key={i} className="gp-caption" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={item.dot}>{item.inner}</div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {mode === 'solo' && (
                    <button className={`gp-btn ${gameOver ? 'gp-btn-primary' : ''}`} onClick={handleRestart} style={{ flex: 1, padding: '8px' }}>
                        <RotateCcw size={13} /> {t('snake.restart')}
                    </button>
                )}
                <button className="gp-btn" onClick={toggleMute} style={{ flex: 1, padding: '8px', color: muted ? '#ef4444' : '#4ade80' }}>
                    {muted ? <VolumeX size={13} /> : <Volume2 size={13} />} {muted ? t('snake.musicOn') : t('snake.musicOff')}
                </button>
            </div>
            
            {/* Bottom: zoom + exit */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '7px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={handleZoomOut} disabled={zoomLevel <= 60} style={{ background: 'transparent', border: 'none', color: zoomLevel <= 60 ? '#64748b' : '#fff', cursor: zoomLevel <= 60 ? 'not-allowed' : 'pointer', display: 'flex', padding: '3px' }}><ZoomOut size={14} /></button>
                    <span className="gp-ui" style={{ minWidth: '36px', textAlign: 'center', userSelect: 'none' }}>{zoomLevel}%</span>
                    <button onClick={handleZoomIn} disabled={zoomLevel >= 200} style={{ background: 'transparent', border: 'none', color: zoomLevel >= 200 ? '#64748b' : '#fff', cursor: zoomLevel >= 200 ? 'not-allowed' : 'pointer', display: 'flex', padding: '3px' }}><ZoomIn size={14} /></button>
                </div>
                <button className="gp-btn" onClick={() => navigate(mode === 'multiplayer' ? '/snake/multiplayer' : '/snake')} style={{ padding: '9px' }}>
                    <ArrowLeft size={14} /> {t('common.exit', 'Thoát')}
                </button>
            </div>
        </div>
    );
}

// ─── MAIN GAME ───────────────────────────────────────────────────────────────
export default function SnakeGame() {
    const { t } = useTranslation();
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

    const isWin = uiState.statusMessage.includes('WIN') || uiState.statusMessage.includes('Thắng') || uiState.statusMessage.includes('win');
    const isDraw = uiState.statusMessage.includes('DRAW') || uiState.statusMessage.includes('Hòa') || uiState.statusMessage.includes('draw');
    const accentColor = isWin ? '#4ade80' : isDraw ? '#fbbf24' : '#f87171';
    const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : '💀';
    const resultTitle = uiState.statusMessage.split('!')[0] + '!';
    const resultDetail = uiState.statusMessage.includes('(') ? uiState.statusMessage.split('(')[1]?.replace(')', '') : uiState.statusMessage.split('!').slice(1).join('!').trim();

    const [zoomLevel, setZoomLevel] = useState(100);
    const handleZoomIn = () => setZoomLevel(z => Math.min(200, z + 20));
    const handleZoomOut = () => setZoomLevel(z => Math.max(60, z - 20));

    return (
        <div className="snake-main-container" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            display: 'flex', overflow: 'hidden',
            background: 'radial-gradient(circle at center, #292524 0%, #1c1917 100%)',
            outline: 'none'
        }}>
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%' }}>
                
                {/* LEFT PANEL */}
                <div className="snake-left-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    gap: '1rem', overflowY: 'auto', padding: '1.5rem',
                    borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    <div className="gp-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Activity size={18} color="var(--primary-color)" />
                            <span className="gp-title" style={{ fontSize: '1.1rem' }}>Snake {mapSize}</span>
                        </div>
                        <div className="gp-caption" style={{ textAlign: 'center' }}>
                            {mode === 'solo' ? `${t('snake.vs')} (${difficulty})` : `${roomId}`}
                        </div>
                    </div>

                    <div className="gp-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(0,0,0,0.3)' }}>
                        <div className="gp-player-row" style={{ padding: '4px' }}>
                            <Trophy size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                            <span className="gp-ui" style={{ flex: 1 }}>{t('snake.you')}</span>
                            <span className="gp-score" style={{ color: '#4ade80' }}>{uiState.score}</span>
                        </div>
                        {(hasBot || mode === 'multiplayer') && (
                            <div className="gp-player-row" style={{ padding: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', borderRadius: 0 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
                                <span className="gp-ui" style={{ flex: 1 }}>{mode === 'solo' ? `${t('snake.cpu')}` : t('snake.opp')}</span>
                                <span className="gp-score" style={{ color: '#60a5fa' }}>{oppScore}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {hasBot && gameRef.current?.botDead && !uiState.gameOver ? (
                            <span className="gp-title" style={{ color: '#f59e0b' }}>💀 {t('snake.cpuDead')}</span>
                        ) : (
                            <span className="gp-title" style={{ color: uiState.gameOver ? accentColor : 'var(--text-secondary)' }}>
                                {uiState.gameOver ? `${resultEmoji} ${resultTitle}` : t('snake.playing')}
                            </span>
                        )}
                    </div>

                    <LeftPanel gameRef={canvasRef2use} gameOver={uiState.gameOver} accentColor={accentColor} resultEmoji={resultEmoji} resultTitle={resultTitle} resultDetail={resultDetail} t={t} />
                </div>

                {/* CENTER BOARD AREA */}
                <div className="snake-board-area" style={{
                    flex: '1 1 auto', display: 'flex', justifyContent: 'center',
                    minWidth: 0, minHeight: 0, padding: '1rem',
                    overflow: 'hidden', alignItems: 'center', position: 'relative'
                }}>

                    <div style={{ position: 'relative', width: '100%', maxWidth: '85vh', aspectRatio: '1/1', border: '4px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5),0 10px 30px rgba(0,0,0,0.3)', overflow: 'hidden', transform: `scale(${zoomLevel/100})`, transition: 'transform 0.2s', transformOrigin: 'center center' }}>
                        <SnakeCanvas gameRef={canvasRef2use} mapSize={mapSize} />

                        {mode === 'multiplayer' && countdown !== null && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 60, gap: '16px' }}>
                                <div className="gp-ui" style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('snake.ready')}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: myColor, boxShadow: `0 0 10px ${myColor}` }} />
                                    <span style={{ fontWeight: 700, fontSize: '1.2rem', color: myColor }}>{myColorLabel}</span>
                                </div>
                                <div style={{ fontSize: countdown === 0 ? '2.5rem' : '6rem', fontWeight: 900, color: countdown === 0 ? '#4ade80' : '#fff', textShadow: '0 0 20px currentColor', transition: 'all 0.3s' }}>
                                    {countdown === 0 ? t('snake.start') : countdown}
                                </div>
                            </div>
                        )}

                        {uiState.gameOver && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,22,0.42)', zIndex: 5, pointerEvents: 'none', borderRadius: '4px' }} />}
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="snake-right-panel" style={{
                    flex: '0 0 240px', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: '1rem', overflowY: 'auto', padding: '1.5rem',
                    borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)'
                }}>
                    <RightPanel mode={mode} gameOver={uiState.gameOver} handleRestart={handleRestart} navigate={navigate} playerColor={playerColor} muted={muted} toggleMute={toggleMute} t={t} zoomLevel={zoomLevel} handleZoomIn={handleZoomIn} handleZoomOut={handleZoomOut} />
                </div>
            </div>
            <style>{`
                @media (max-width: 850px) {
                    .snake-main-container > div {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }
                    .snake-left-panel, .snake-right-panel {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        border-right: none !important;
                        border-left: none !important;
                        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                        max-height: none !important;
                    }
                    .snake-board-area {
                        flex: 0 0 auto !important;
                        display: flex !important;
                        justify-content: center !important;
                        padding: 0.5rem !important;
                        min-height: 60vh;
                    }
                }
            `}</style>
        </div>
    );
}
