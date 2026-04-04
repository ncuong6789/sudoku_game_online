import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, FastForward, Volume2, VolumeX } from 'lucide-react';
import { usePikachuLogic } from './usePikachuLogic';
import { useBgMusic } from '../../hooks/useBgMusic';

export default function PikachuGame() {
    const navigate = useNavigate();
    const gameBoardRef = useRef(null);
    const {
        board, ROWS, COLS, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair, penaltyFlash,
        handleTileClick, useHint, handleShuffle, initGame
    } = usePikachuLogic();

    const { muted, toggleMute } = useBgMusic('/audio/pikachu_bg.ogg', status === 'playing', 0.3);

    const renderPath = () => {
        if (!connectedPath || connectedPath.length < 2 || !gameBoardRef.current) return null;
        
        const rects = [];
        for (let pt of connectedPath) {
            const el = document.getElementById(`pika-cell-${pt.r}-${pt.c}`);
            if (el) {
                const r = el.getBoundingClientRect();
                const parentBox = gameBoardRef.current.getBoundingClientRect();
                rects.push({
                    x: r.left - parentBox.left + r.width / 2,
                    y: r.top - parentBox.top + r.height / 2
                });
            }
        }

        if (rects.length < 2) return null;

        let d = `M ${rects[0].x} ${rects[0].y}`;
        for (let i = 1; i < rects.length; i++) {
            d += ` L ${rects[i].x} ${rects[i].y}`;
        }

        return (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                <path d={d} fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter" 
                      style={{ filter: 'drop-shadow(0 0 6px #ef4444)', animation: 'flashRow 0.2s infinite' }} />
            </svg>
        );
    };

    const isHinted = (r, c) => {
        if (!hintPair) return false;
        return (hintPair[0].r === r && hintPair[0].c === c) || (hintPair[1].r === r && hintPair[1].c === c);
    };

    return (
        <div className="full-page-mobile-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100vw', height: '100vh', padding: '2rem 1rem', boxSizing: 'border-box' }}>
            <style>{`
                @keyframes penaltyShake {
                    0%   { transform: translateX(0); }
                    20%  { transform: translateX(-6px); }
                    40%  { transform: translateX(6px); }
                    60%  { transform: translateX(-4px); }
                    80%  { transform: translateX(4px); }
                    100% { transform: translateX(0); }
                }
                @keyframes fadeUp {
                    0%   { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-14px); }
                }
            `}</style>
            
            {/* Header: Timer & Score */}
            <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <div>Level: <span style={{ color: '#eab308' }}>{level}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted ? '#ef4444' : '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        Score: <span style={{ color: '#4ade80' }}>{score}</span>
                    </div>
                </div>
                {/* Timer Bar */}
                <div style={{ 
                    width: '100%', height: '20px', 
                    background: '#334155', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: penaltyFlash ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.1)',
                    boxShadow: penaltyFlash ? '0 0 12px rgba(239,68,68,0.9), inset 0 2px 5px rgba(0,0,0,0.5)' : 'inset 0 2px 5px rgba(0,0,0,0.5)',
                    animation: penaltyFlash ? 'penaltyShake 0.3s ease' : 'none',
                    transition: 'border 0.15s, box-shadow 0.15s'
                }}>
                    <div style={{ 
                        height: '100%',
                        width: `${timeLeft}%`,
                        background: penaltyFlash
                            ? '#ef4444'
                            : (timeLeft > 50 ? '#22c55e' : (timeLeft > 20 ? '#eab308' : '#ef4444')),
                        transition: penaltyFlash
                            ? 'width 0.15s cubic-bezier(0.3, 0, 0.7, 1), background 0.1s'
                            : 'width 0.1s linear, background 0.3s ease',
                        boxShadow: 'inset 0 5px 5px rgba(255,255,255,0.2)'
                    }} />
                </div>
                {/* Penalty indicator text */}
                {penaltyFlash && (
                    <div style={{
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        animation: 'fadeUp 0.6s ease forwards',
                        userSelect: 'none',
                        pointerEvents: 'none'
                    }}>-10% thời gian ⚠️</div>
                )}
            </div>

            <div style={{ 
                width: '100%', maxWidth: '1000px', 
                background: '#1e293b', 
                borderRadius: '8px', 
                padding: '20px', 
                display: 'flex', 
                gap: '20px', 
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
                
                {/* Lưới Game */}
                <div 
                    ref={gameBoardRef}
                    style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS + 2}, 1fr)`,
                        gridTemplateRows: `repeat(${ROWS + 2}, 1fr)`,
                        gap: '0px',
                        backgroundImage: 'url(/pikachu_sprites/bg.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '4px',
                        border: '2px solid rgba(0,0,0,0.5)',
                        boxShadow: '0 0 15px rgba(0,0,0,0.6)',
                        width: 'calc(100% - 240px)', // Chừa phần cho sidebar
                        aspectRatio: '1/1', // Đảm bảo hình vuông
                        minWidth: '300px'
                    }}
                >
                    {renderPath()}
                    
                    {board.map((row, r) => row.map((cell, c) => {
                        const isBoundary = r === 0 || r === ROWS + 1 || c === 0 || c === COLS + 1;
                        const isSel = selected?.r === r && selected?.c === c;
                        const isHnt = isHinted(r, c);

                        return (
                            <div 
                                key={`${r}-${c}`} 
                                id={`pika-cell-${r}-${c}`}
                                onClick={() => !isBoundary && handleTileClick(r, c)}
                                style={{
                                    position: 'relative',
                                    width: '100%', 
                                    height: '100%', 
                                    cursor: (!isBoundary && cell !== 0) ? 'pointer' : 'default',
                                    transition: 'opacity 0.1s',
                                    opacity: cell === 0 ? 0 : 1
                                }}
                            >
                                {cell !== 0 && !isBoundary && (
                                    <>
                                        <img 
                                            src={`/pikachu_sprites/${cell}.jpg`} 
                                            alt={`Pokemon ${cell}`}
                                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }}
                                        />
                                        {(isSel || isHnt) && (
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                border: isSel ? '2px solid #ef4444' : '2px solid #eab308',
                                                boxShadow: isSel ? 'inset 0 0 10px rgba(239, 68, 68, 0.8)' : 'inset 0 0 10px rgba(234, 179, 8, 0.8)',
                                                background: isSel ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                                                zIndex: 2, boxSizing: 'border-box'
                                            }} />
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    }))}
                </div>

                {/* Sidebar Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '220px', flexShrink: 0 }}>
                    <div style={{ background: '#334155', padding: '1.5rem 1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>MOVEMENT MODE</div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.3rem' }}>
                            {((level-1)%5) === 0 ? 'STATIC' : 
                             ((level-1)%5) === 1 ? 'GRAVITY DOWN' : 
                             ((level-1)%5) === 2 ? 'SHIFT LEFT' : 
                             ((level-1)%5) === 3 ? 'SHIFT RIGHT' : 'SPLIT CENTER'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button className="btn-primary" onClick={useHint} disabled={hints <= 0} style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: hints <= 0 ? 0.5 : 1, background: '#3b82f6' }}>
                            <Lightbulb size={18} /> Gợi ý (Còn {hints})
                        </button>
                        <button className="btn-secondary" onClick={handleShuffle} disabled={shuffles <= 0} style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: shuffles <= 0 ? 0.5 : 1, background: 'transparent' }}>
                            <RefreshCw size={18} /> Đảo hình (Còn {shuffles})
                        </button>
                    </div>
                    
                    <div style={{ flex: 1 }} />
                    <button className="btn-secondary" onClick={() => navigate('/pikachu')} style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', marginTop: '20px' }}>
                        <ArrowLeft size={18} /> Thoát Game
                    </button>
                </div>
            </div>

            {/* Overlays */}
            {status !== 'playing' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100, gap: '25px'
                }}>
                    <div style={{ fontSize: '6rem', animation: 'float 3s ease-in-out infinite' }}>
                        {status === 'won' ? '🎉' : '💀'}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '3.5rem', textAlign: 'center', color: status === 'won' ? '#4ade80' : '#ef4444', fontWeight: 900 }}>
                        {status === 'won' ? 'LEVEL CLEARED!' : 'TIME OUT!'}
                    </h2>
                    {status === 'gameover' && <div style={{ fontSize: '1.2rem', color: '#fff' }}>Bạn đã đạt được điểm số: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{score}</span></div>}
                    
                    <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                        <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => initGame(status === 'won')}>
                            {status === 'won' ? <><FastForward size={24} /> Chơi Level {level + 1}</> : <><RefreshCw size={24} /> Chơi lại từ đầu</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
