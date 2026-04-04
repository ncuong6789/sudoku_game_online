import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, FastForward } from 'lucide-react';
import { usePikachuLogic } from './usePikachuLogic';

export default function PikachuGame() {
    const navigate = useNavigate();
    const gameBoardRef = useRef(null);
    const {
        board, ROWS, COLS, level, score, timeLeft, status, selected, connectedPath,
        hints, shuffles, hintPair,
        handleTileClick, useHint, handleShuffle, initGame
    } = usePikachuLogic();

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
        <div className="full-page-mobile-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100vw', height: '100vh', padding: '1rem', boxSizing: 'border-box', background: '#0d1117' }}>
            
            {/* Header: Timer & Score */}
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <div>Level: <span style={{ color: '#eab308' }}>{level}</span></div>
                    <div>Score: <span style={{ color: '#4ade80' }}>{score}</span></div>
                </div>
                {/* Timer Bar */}
                <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ 
                        height: '100%', 
                        width: `${timeLeft}%`, 
                        background: timeLeft > 50 ? 'linear-gradient(90deg, #22c55e, #84cc16)' : timeLeft > 20 ? 'linear-gradient(90deg, #eab308, #f59e0b)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                        transition: 'width 1s linear, background 0.3s'
                    }} />
                </div>
            </div>

            <div className="glass-panel" style={{ width: 'fit-content', padding: '1.2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                
                {/* Lưới Game */}
                <div 
                    ref={gameBoardRef}
                    style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS + 2}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${ROWS + 2}, minmax(0, 1fr))`,
                        gap: '2px', // khoảng cách nhỏ
                        background: 'rgba(0,0,0,0.4)',
                        padding: '10px',
                        borderRadius: '12px',
                        border: '2px solid rgba(255,255,255,0.05)'
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
                                    width: 'min(4.3vh, 4.3vw)', 
                                    height: 'min(5vh, 5vw)', // Tỉ lệ hơi chữ nhật một chút
                                    minWidth: '22px', minHeight: '26px',
                                    background: isBoundary ? 'transparent' : cell === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: (!isBoundary && cell !== 0) ? 'pointer' : 'default',
                                    borderRadius: '4px',
                                    border: isSel ? '2px solid #ef4444' : isHnt ? '2px solid #eab308' : (cell !== 0 && !isBoundary) ? '1px solid #ccc' : '1px solid transparent',
                                    boxShadow: isSel ? '0 0 10px #ef4444' : isHnt ? '0 0 10px #eab308' : (cell !== 0 && !isBoundary) ? 'inset -2px -2px 0px rgba(0,0,0,0.2)' : 'none',
                                    transition: 'all 0.1s',
                                    opacity: cell === 0 ? 0 : 1
                                }}
                            >
                                {cell !== 0 && !isBoundary && (
                                    <img 
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${cell}.png`} 
                                        alt={`Pokemon ${cell}`}
                                        style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                                    />
                                )}
                            </div>
                        );
                    }))}
                </div>

                {/* Sidebar Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '180px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Movement Mode</div>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            {((level-1)%5) === 0 ? 'STATIC' : 
                             ((level-1)%5) === 1 ? 'GRAVITY DOWN' : 
                             ((level-1)%5) === 2 ? 'SHIFT LEFT' : 
                             ((level-1)%5) === 3 ? 'SHIFT RIGHT' : 'SPLIT CENTER'}
                        </div>
                    </div>

                    <button className="btn-primary" onClick={useHint} disabled={hints <= 0} style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', opacity: hints <= 0 ? 0.5 : 1 }}>
                        <Lightbulb size={18} /> Gợi ý (Còn {hints})
                    </button>
                    <button className="btn-secondary" onClick={handleShuffle} disabled={shuffles <= 0} style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', opacity: shuffles <= 0 ? 0.5 : 1 }}>
                        <RefreshCw size={18} /> Đảo hình (Còn {shuffles})
                    </button>
                    
                    <div style={{ flex: 1 }} />
                    <button className="btn-secondary" onClick={() => navigate('/pikachu')} style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
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
