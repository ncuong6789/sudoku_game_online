import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Heart } from 'lucide-react';
import { usePacmanLogic } from './usePacmanLogic';

// ─── Custom Cute Ghost SVG ───────────────────────────────────────────────────
function GhostArt({ color = '#ef4444', dir = { x: 0, y: 0 }, state = 'chase', size = '95%', frightenedFlash = false }) {
    const isFr = state === 'frightened';
    const isDead = state === 'dead';
    const bodyColor = isDead ? 'transparent' : frightenedFlash ? '#ffffff' : isFr ? '#1d4ed8' : color;

    const px = dir.x * 2.5;
    const py = dir.y * 2.5;

    const eye = (cx, cy) => isFr
        ? <circle cx={cx} cy={cy} r={2.5} fill={frightenedFlash ? '#1d4ed8' : '#fff'} />
        : isDead
            ? (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1d4ed8' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>)
            : (<>
                <ellipse cx={cx} cy={cy} rx={4.5} ry={5.5} fill='white' />
                <circle cx={cx + px} cy={cy + py} r={2.5} fill='#1a1a2e' />
                <circle cx={cx + px + 0.8} cy={cy + py - 0.8} r={0.9} fill='white' />
            </>);

    return (
        <svg width={size} height={size} viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg' style={{ display: 'block', overflow: 'visible' }}>
            <path
                d={['M 2 28', 'L 2 12', 'Q 2 2 14 2', 'Q 26 2 26 12', 'L 26 28', 'Q 23.7 24 21.3 28', 'Q 19 24 16.7 28', 'Q 14.3 24 12 28', 'Q 9.7 24 7.3 28', 'Q 5 24 2 28', 'Z',].join(' ')}
                fill={bodyColor}
                style={{ transition: 'fill 0.1s' }}
            />
            {!isDead && <>{eye(9.5, 12)}{eye(18.5, 12)}</>}
            {isDead && <>{eye(9.5, 14)}{eye(18.5, 14)}</>}
            {isFr && !isDead && (
                <path d='M 8 19 Q 10 17 12 19 Q 14 21 16 19 Q 18 17 20 19' stroke={frightenedFlash ? '#1d4ed8' : '#fff'} strokeWidth={1.5} fill='none' strokeLinecap='round' />
            )}
        </svg>
    );
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function PacmanGame() {
    const { state = {} } = useLocation();
    const navigate = useNavigate();
    const { mapType = 'Classic', difficulty = 'medium' } = state;

    const {
        mapGrid, pacman, ghosts, dots, pills, score, lives, phase,
        frightenedTimer, protectedTimer, totalDotsRef, handleRestart
    } = usePacmanLogic(mapType, difficulty);

    if (!mapGrid.length || !pacman) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>👾</div>
                <div style={{ color: '#fbbf24', marginTop: '1rem' }}>Loading...</div>
            </div>
        </div>
    );

    const cols = mapGrid[0].length, rows = mapGrid.length;
    const isDying = phase === 'dying';
    const isProtected = protectedTimer > 0;

    return (
        <div className="glass-panel" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'stretch',
            width: 'fit-content', height: 'fit-content',
            maxHeight: '94vh', maxWidth: '98vw', margin: 'auto',
            padding: '1.2rem', boxSizing: 'border-box', gap: '1.5rem',
            overflow: 'hidden', minWidth: 0, background: 'rgba(23, 23, 33, 0.85)',
            backdropFilter: 'blur(25px)', borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        }}>
            {/* ── BOARD ── */}
            <div style={{
                position: 'relative', height: 'min(85vh, 800px)', width: 'min(calc(85vh * 0.9), 720px)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%', height: '100%',
                    display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`,
                    background: '#000', borderRadius: '4px', boxSizing: 'border-box'
                }}>
                    {mapGrid.map((row, y) => row.map((cell, x) => {
                        const isWall = cell === 'W' || cell === '|';
                        const isGate = cell === 'H' || cell === '-';
                        return (
                            <div key={`c${x}${y}`} style={{ background: isWall ? '#1e3a8a' : isGate ? '#78350f' : '#000', border: isWall ? '0.5px solid #1e40af' : 'none', boxSizing: 'border-box' }} />
                        );
                    }))}

                    {Array.from(dots).map(k => {
                        const [x, y] = k.split(',').map(Number); return (
                            <div key={`d${k}`} style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                            }}>
                                <div style={{ width: '35%', height: '35%', background: '#fbbf24', borderRadius: '50%' }} />
                            </div>
                        );
                    })}

                    {Array.from(pills).map(k => {
                        const [x, y] = k.split(',').map(Number); return (
                            <div key={`p${k}`} style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(x / cols) * 100}%`, top: `${(y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                            }}>
                                <div style={{ width: '70%', height: '70%', background: '#ef4444', borderRadius: '50%', animation: 'pacPulse 0.6s infinite alternate', position: 'relative', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                                    <div style={{ position: 'absolute', top: '-25%', left: '40%', width: '20%', height: '40%', background: '#22c55e', borderRadius: '4px', transform: 'rotate(20deg)' }} />
                                </div>
                            </div>
                        );
                    })}

                    {ghosts.map(g => {
                        const fr = g.state === 'frightened';
                        const flash = fr && frightenedTimer < 8 && frightenedTimer % 2 === 0;
                        const skipTrans = Math.abs(g.x - (g.prevX ?? g.x)) > 1;
                        return (
                            <div key={g.id} style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(g.x / cols) * 100}%`, top: `${(g.y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                                transition: skipTrans ? 'none' : `left ${fr ? 0.3 : 0.1}s linear, top ${fr ? 0.3 : 0.1}s linear`, pointerEvents: 'none'
                            }}>
                                <GhostArt color={g.color} dir={g.dir} state={g.state} frightenedFlash={flash} size='95%' />
                            </div>
                        );
                    })}

                    {(() => {
                        const skipTrans = Math.abs(pacman.x - (pacman.prevX ?? pacman.x)) > 1;
                        return (
                            <div style={{
                                position: 'absolute', width: `${100 / cols}%`, height: `${100 / rows}%`,
                                left: `${(pacman.x / cols) * 100}%`, top: `${(pacman.y / rows) * 100}%`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11,
                                transition: (isDying || skipTrans) ? 'none' : 'left 0.1s linear,top 0.1s linear',
                                pointerEvents: 'none', animation: isDying ? 'pacDie 1.2s forwards' : isProtected ? 'pacFlash 0.25s infinite' : undefined
                            }}>
                                <svg width='88%' height='88%' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg' style={{ transform: `rotate(${pacman.dir.x === 1 ? 0 : pacman.dir.y === 1 ? 90 : pacman.dir.x === -1 ? 180 : -90}deg)`, display: 'block' }}>
                                    <path fill='#fbbf24' d='M14,14 L28,5 A13,13 0 1,0 28,23 Z'>
                                        {!isDying && !isProtected && (
                                            <animate attributeName='d' values='M14,14 L28,5 A13,13 0 1,0 28,23 Z;M14,14 L28,13 A13,13 0 1,0 28,15 Z' dur='0.25s' repeatCount='indefinite' calcMode='linear' />
                                        )}
                                    </path>
                                </svg>
                            </div>
                        );
                    })()}

                    {phase === 'ready' && !isDying && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 20, borderRadius: '4px' }}>
                            <h2 style={{ color: '#fbbf24', fontSize: 'clamp(1rem,4vw,2.5rem)', animation: 'pacFlash 0.8s infinite', margin: 0 }}>READY!</h2>
                        </div>
                    )}
                </div>

                {(phase === 'over' || phase === 'won') && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '16px', borderRadius: '8px'
                    }}>
                        <div style={{ fontSize: 'clamp(3rem,8vw,5rem)' }}>{phase === 'won' ? '🏆' : '💀'}</div>
                        <h2 style={{ fontSize: 'clamp(1.5rem,5vw,3rem)', margin: 0, color: phase === 'won' ? '#4ade80' : '#f87171' }}>
                            {phase === 'won' ? 'VICTORY!' : 'GAME OVER!'}
                        </h2>
                        <p style={{ fontSize: 'clamp(1rem,3vw,1.5rem)', color: '#fbbf24', margin: 0 }}>SCORE: {score}</p>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} onClick={handleRestart}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><RotateCcw size={24} /> Chơi Lại</div>
                                <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 'normal' }}>(Phím Space)</span>
                            </button>
                            <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeft size={18} /> Về Sảnh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── SIDEBAR ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '240px', flexShrink: 0, height: '100%', overflowY: 'auto' }}>
                <div style={{ padding: 'clamp(0.8rem,1.5vw,1.2rem)', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Score</div>
                        <div style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{score}</div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Lives</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            {[...Array(3)].map((_, i) => <Heart key={i} size={22} color={i < lives ? '#ef4444' : '#374151'} fill={i < lives ? '#ef4444' : 'none'} />)}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}><span style={{ color: 'var(--text-secondary)' }}>Map</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{mapType}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}><span style={{ color: 'var(--text-secondary)' }}>Độ khó</span><span style={{ fontWeight: 700, fontSize: '0.72rem', color: difficulty === 'hard' ? '#ef4444' : '#f59e0b' }}>{difficulty === 'hard' ? '🔥 Khó' : '⚡ TB'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}><span style={{ color: 'var(--text-secondary)' }}>Chấm còn</span><span style={{ color: '#fbbf24', fontWeight: 600 }}>{dots.size}</span></div>
                        {totalDotsRef.current > 0 && (() => {
                            const eaten = totalDotsRef.current - dots.size;
                            const pct = Math.round((eaten / totalDotsRef.current) * 100);
                            return (
                                <div style={{ marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}><span>Ăn được</span><span>{pct}%</span></div>
                                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: pct >= 60 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#4ade80', transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Ghosts</div>
                    {ghosts.map(g => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                            <div style={{ width: 18, height: 18, flexShrink: 0 }}>
                                <GhostArt color={g.color} dir={g.dir} state={g.state} size='100%' frightenedFlash={false} />
                            </div>
                            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{g.id[0] + g.id.slice(1).toLowerCase()}</span>
                            <span style={{ fontSize: '0.65rem' }}>{g.state === 'frightened' ? '😱' : g.state === 'dead' ? '💀' : g.state === 'house' ? '🏠' : g.state === 'exiting' ? '🚪' : '🎯'}</span>
                        </div>
                    ))}
                </div>

                {frightenedTimer > 0 && (
                    <div style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(29,78,216,0.5)', background: 'rgba(29,78,216,0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginBottom: '2px' }}>⚡ POWER</div><div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa' }}>{frightenedTimer}</div>
                    </div>
                )}
                {isProtected && phase === 'playing' && (
                    <div style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', animation: 'pacFlash 0.5s infinite' }}>🛡️ Bất Tử</div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                    <button className="btn-primary" onClick={handleRestart} style={{ padding: '9px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%', fontSize: '0.9rem' }}>
                        <RotateCcw size={15} /> Chơi Lại
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/pacman')} style={{ padding: '9px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%', fontSize: '0.9rem' }}>
                        <ArrowLeft size={15} /> Về Sảnh
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pacDie { 0% { transform:scale(1) rotate(0deg); opacity:1; } 60% { transform:scale(1.3) rotate(180deg); opacity:0.7; } 100%{ transform:scale(0) rotate(360deg); opacity:0; } }
                @keyframes pacFlash { 0%,100%{opacity:1} 50%{opacity:0.2} }
                @keyframes pacPulse { 0%{transform:scale(0.8)} 100%{transform:scale(1.2)} }
            `}</style>
        </div>
    );
}
