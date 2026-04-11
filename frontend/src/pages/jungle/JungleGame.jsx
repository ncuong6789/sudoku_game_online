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

const PIECE_DESCRIPTIONS = {
    1: 'Bơi được trong sông, ăn được Voi',
    2: 'Di chuyển bình thường',
    3: 'Di chuyển bình thường',
    4: 'Di chuyển bình thường',
    5: 'Di chuyển bình thường',
    6: 'Nhảy qua sông, bị Chuột ăn trong sông',
    7: 'Nhảy qua sông, bị Chuột ăn trong sông',
    8: 'Bị Chuột ăn, không vào được sông'
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
    1: '⚀', 2: '⚂', 3: '⚃', 4: '⚄', 5: '⚅', 6: '⚌', 7: '⚘', 8: '▣'
};

const ANIMAL_COLORS = {
    1: '#9ca3af', 2: '#f97316', 3: '#a855f7', 4: '#ef4444', 5: '#eab308', 6: '#f59e0b', 7: '#eab308', 8: '#64748b'
};

const ANIMAL_SYMBOLS = {
    1: { char: '🐭', name: 'Rat', sound: 'squeak' },
    2: { char: '🐱', name: 'Cat', sound: 'meow' },
    3: { char: '🐶', name: 'Dog', sound: 'bark' },
    4: { char: '🐺', name: 'Wolf', sound: 'howl' },
    5: { char: '🐆', name: 'Leopard', sound: 'growl' },
    6: { char: '🐯', name: 'Tiger', sound: 'roar' },
    7: { char: '🦁', name: 'Lion', sound: 'roar' },
    8: { char: '🐘', name: 'Elephant', sound: 'trumpet' }
};

export default function JungleGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, mode, difficulty } = location.state || { roomId: 'local', mode: 'solo', difficulty: 'medium' };
    
    const canvasRef = useRef(null);
    const [hintMoves, setHintMoves] = useState(null);
    
    const { playSelect, playMove, playCapture, playWin, playLose } = useJungleSounds();

    const { pieces, turn, selectedPiece, validMoves, gameOver, isLoading, handleSelect, myId } = useJungleLogic(
        roomId, mode, difficulty, 
        () => {}, // No auto-hint on move
        (isJump) => playMove(isJump),
        (capturedPiece, attackerPiece) => playCapture(capturedPiece?.type, attackerPiece?.type),
        (winner) => {
            if (winner === myId) playWin();
            else playLose();
        }
    );

    const getHint = () => {
        socket.emit(EVENTS.JUNGLE_GET_HINT, { roomId });
    };

    // Listen for hint response
    useEffect(() => {
        const handleHintResponse = (suggestions) => {
            setHintMoves(suggestions);
        };
        socket.on('jungleHintReceived', handleHintResponse);
        return () => socket.off('jungleHintReceived', handleHintResponse);
    }, []);

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

                // Animal symbol with modern emoji style
                ctx.shadowBlur = 6;
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.font = `normal ${TILE_SIZE/1.8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw emoji in badge
                const symbol = ANIMAL_SYMBOLS[p.type];
                ctx.fillText(symbol?.char || p.type, 0, 3);

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

            // 5. Draw Hints with animation (show best move)
            if (hintMoves && hintMoves.length > 0) {
                const bestMove = hintMoves[0];
                const { from, to } = bestMove;
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
    }, [pieces, selectedPiece, validMoves, turn, myId, hintMoves]);

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
                
                {/* TRÁI: INFO & RULES */}
                <div style={{
                    flex: '0 0 260px',
                    width: '260px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1rem',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <span>📊</span> Cấp bậc & Kỹ năng
                    </h3>

                    <div style={{
                        flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)',
                        borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                        {[8,7,6,5,4,3,2,1].map(v => (
                            <div key={v} style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: v <= 2 ? 'rgba(251,191,36,0.08)' : (v >= 7 ? 'rgba(239,68,68,0.08)' : 'transparent'),
                                padding: '6px', borderRadius: '6px'
                            }}>
                                <div style={{ 
                                    width: '28px', height: '28px', borderRadius: '6px', 
                                    background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {ANIMAL_SYMBOLS[v]?.char || v}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{PIECE_NAMES[v]}</span>
                                        {v === 8 && <span style={{ fontSize: '0.65rem', color: '#ef4444', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Yếu với 🐭</span>}
                                        {v === 1 && <span style={{ fontSize: '0.65rem', color: '#4ade80', background: 'rgba(74,222,128,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Ăn được 🐘</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, marginBottom: '6px' }}>🎯 LUẬT</div>
                            <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                                <li>Lớn ăn nhỏ (8 vs 1 ngoại lệ)</li>
                                <li>Hổ/Sư tử <span style={{color:'#4ade80'}}>nhảy sông</span> 2 ô</li>
                                <li>Chuột <span style={{color:'#4ade80'}}>bơi</span> & ăn Voi</li>
                                <li>Vào Hang = <span style={{color:'#ffd700'}}>THẮNG</span></li>
                            </ul>
                        </div>
                        
                        <div style={{ padding: '8px', background: 'rgba(96,165,250,0.1)', borderRadius: '6px', border: '1px solid rgba(96,165,250,0.2)' }}>
                            <div style={{ fontSize: '0.7rem', color: '#60b5ff', fontWeight: 600 }}>🏞 Địa hình</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                                🌊 Sông | ⬜ Bẫy | 🏠 Hang
                            </div>
                        </div>
                    </div>
                </div>

                {/* GIỮA: BÀN CỜ */}
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: '320px', padding: 0, margin: 0, maxHeight: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: turn === myId ? 1 : 0.5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: turn === myId ? '#4ade80' : '#fff' }}>BẠN</span>
                        </div>
                        <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>{difficulty.toUpperCase()}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: turn !== myId ? 1 : 0.5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#60b5fa' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: turn !== myId ? '#60b5fa' : '#fff' }}>ĐỐI</span>
                        </div>
                    </div>

                    <div style={{
                        position: 'relative',
                        border: '6px solid rgba(15, 15, 25, 0.95)',
                        borderRadius: '12px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        background: '#0f172a',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        maxHeight: 'calc(100vh - 120px)',
                        aspectRatio: '7 / 9'
                    }}>
                        {isLoading && (
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

                {/* PHẢI: CONTROLS */}
                <div style={{ flex: '0 0 240px', width: '240px', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '100%', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>♟ CỜ THÚ</div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button className="btn-primary" onClick={handleReset} style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                <RotateCcw size={16} /> Chơi ván mới
                            </button>
                            
                            <button className="btn-secondary" onClick={getHint} disabled={turn !== myId || isLoading} style={{ borderColor: '#fbbf24', color: '#fbbf24', padding: '10px', fontSize: '0.85rem' }}>
                                <HelpCircle size={16} /> Gợi ý (AI)
                            </button>

                            {hintMoves && hintMoves.length > 0 && (
                                <div style={{ 
                                    padding: '10px', 
                                    background: 'rgba(251,191,36,0.1)', 
                                    borderRadius: '8px', 
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    animation: 'fadeIn 0.3s ease'
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600, marginBottom: '6px' }}>💡 Gợi ý</div>
                                    {hintMoves.slice(0, 3).map((move, idx) => {
                                        const pct = move.percentage || 0;
                                        let color;
                                        if (pct >= 80) color = '#4ade80';
                                        else if (pct >= 50) color = '#60b5fa';
                                        else if (pct >= 20) color = '#fbbf24';
                                        else color = '#ef4444';
                                        
                                        return (
                                        <div key={idx} style={{ 
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '6px', marginBottom: '4px',
                                            background: idx === 0 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: '6px', fontSize: '0.75rem'
                                        }}>
                                            <span style={{ 
                                                width: '16px', height: '16px', borderRadius: '50%', 
                                                background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.6rem', fontWeight: 700, color: '#000'
                                            }}>{idx+1}</span>
                                            <span style={{ color: '#fff' }}>
                                                {ANIMAL_SYMBOLS[pieces.find(p => p.x === move.from.x && p.y === move.from.y)?.type]?.char || '?'}
                                                {String.fromCharCode(65 + move.from.x)}{9 - move.from.y}→{String.fromCharCode(65 + move.to.x)}{9 - move.to.y}
                                            </span>
                                        </div>
                                    )})}
                                    <button onClick={() => setHintMoves(null)} style={{ width: '100%', padding: '4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>✕ Ẩn</button>
                                </div>
                            )}
                            
                            <button className="btn-secondary" onClick={() => navigate('/jungle')} style={{ padding: '10px', fontSize: '0.85rem' }}>
                                <ArrowLeft size={16} /> Thoát
                            </button>
                        </div>
                    </div>
                </div>

                {/* GAME OVER SYNC OVERLAY */}
                {gameOver !== null && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <div style={{ background: 'rgba(30,30,40,0.95)', borderRadius: '24px', padding: '40px 50px', border: `1px solid ${gameOver === myId ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, boxShadow: gameOver === myId ? '0 0 40px rgba(251,191,36,0.3)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <Trophy size={60} color={gameOver === myId ? '#fbbf24' : '#94a3b8'} />
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: gameOver === myId ? '#fbbf24' : '#fff', margin: 0 }}>
                                {gameOver === myId ? 'THẮNG!' : 'THUA'}
                            </h2>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={handleReset} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: gameOver === myId ? '#fbbf24' : '#ef4444', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                    CHƠI LẠI
                                </button>
                                <button onClick={() => navigate('/jungle')} style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}>
                                    THOÁT
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
