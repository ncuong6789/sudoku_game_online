import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Hexagon, Smile, Star, Flame, Trophy } from 'lucide-react';

const DIFFICULTY_OPTIONS = [
    { key: 'Easy', label: 'Dễ', icon: <Smile size={18} />, color: '#22c55e', desc: 'Phù hợp người mới' },
    { key: 'Medium', label: 'Trung Bình', icon: <Star size={18} />, color: '#f59e0b', desc: 'AI biết dùng Pháo, Mã' },
    { key: 'Hard', label: 'Khó', icon: <Flame size={18} />, color: '#f97316', desc: 'Sâu sắc, tấn công mạnh' },
    { key: 'Expert', label: 'Chuyên Gia', icon: <Trophy size={18} />, color: '#ef4444', desc: 'Tối đa sức mạnh' },
];

export default function XiangqiHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [isFlipping, setIsFlipping] = useState(false);
    const [assignedColor, setAssignedColor] = useState(null);
    const [soloColor, setSoloColor] = useState('random');

    const selectedDiff = DIFFICULTY_OPTIONS.find(d => d.key === difficulty) || DIFFICULTY_OPTIONS[1];

    const handleStartSolo = () => {
        setIsFlipping(true);
        setAssignedColor(null);

        if (soloColor === 'random') {
            let flips = 0;
            const interval = setInterval(() => {
                setAssignedColor(flips % 2 === 0 ? 'w' : 'b');
                flips++;
            }, 150);

            setTimeout(() => {
                clearInterval(interval);
                const finalColor = Math.random() < 0.5 ? 'w' : 'b';
                setAssignedColor(finalColor);
                setTimeout(() => {
                    navigate('/xiangqi/game', { state: { mode: 'solo', difficulty, playerColor: finalColor } });
                }, 1000);
            }, 1500);
        } else {
            navigate('/xiangqi/game', { state: { mode: 'solo', difficulty, playerColor: soloColor } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{
                position: 'relative', overflow: 'hidden', padding: '1.5rem',
                width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', background: 'rgba(23,23,33,0.92)',
                borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>

                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '14px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{
                        width: '60px', height: '60px', background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(220,38,38,0.4)', border: '2px solid #fecaca',
                        animation: 'pulse-glow 3s ease-in-out infinite'
                    }}>
                        <Hexagon size={36} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '2.4rem', margin: 0,
                            background: 'linear-gradient(135deg, #fecaca, #ef4444)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 900, letterSpacing: '2px'
                        }}>
                            CỜ TƯỚNG
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                            <Star size={12} color="#fbbf24" />
                            <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '1px' }}>
                                AI MẠNH MẼ
                            </span>
                        </div>
                    </div>
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 700, marginBottom: '10px', letterSpacing: '1px' }}>
                        CHỌN ĐỘ KHÓ
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {DIFFICULTY_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setDifficulty(opt.key)}
                                disabled={isFlipping}
                                style={{
                                    padding: '10px 4px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    background: difficulty === opt.key
                                        ? `linear-gradient(135deg, ${opt.color}33, ${opt.color}22)`
                                        : 'rgba(255,255,255,0.04)',
                                    color: difficulty === opt.key ? opt.color : '#666',
                                    border: `2px solid ${difficulty === opt.key ? opt.color : 'rgba(255,255,255,0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: difficulty === opt.key ? `0 0 16px ${opt.color}44` : 'none',
                                    transform: difficulty === opt.key ? 'scale(1.02)' : 'scale(1)',
                                }}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <p style={{
                        fontSize: '0.8rem', color: selectedDiff.color,
                        textAlign: 'center', marginTop: '8px', marginBottom: '4px',
                        opacity: 0.85, fontWeight: 500
                    }}>
                        {selectedDiff.desc}
                    </p>
                </div>

                {/* Color Selection */}
                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 700, marginBottom: '10px', letterSpacing: '1px' }}>
                        CÀM QUÂN (SOLO)
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setSoloColor('w')}
                            disabled={isFlipping}
                            style={{
                                flex: 1, padding: '10px 8px', fontSize: '0.85rem', fontWeight: 'bold',
                                background: '#fef2f2', color: '#dc2626',
                                border: soloColor === 'w' ? '2px solid #ef4444' : '2px solid transparent',
                                outline: 'none', borderRadius: '12px', cursor: 'pointer',
                                transition: 'all 0.2s', opacity: soloColor === 'w' ? 1 : 0.45,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: soloColor === 'w' ? '0 0 12px rgba(239,68,68,0.3)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>帥</span>
                            Đỏ (Tiên)
                        </button>

                        <button
                            onClick={() => setSoloColor('random')}
                            disabled={isFlipping}
                            style={{
                                width: '58px', flexShrink: 0, padding: '0', fontSize: '0.85rem', fontWeight: 'bold',
                                background: soloColor === 'random' ? '#6366f1' : 'rgba(255,255,255,0.06)',
                                color: '#fff', outline: 'none',
                                border: soloColor === 'random' ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.12)',
                                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                opacity: soloColor === 'random' ? 1 : 0.45,
                                boxShadow: soloColor === 'random' ? '0 0 12px rgba(99,102,241,0.35)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🎲</span>
                        </button>

                        <button
                            onClick={() => setSoloColor('b')}
                            disabled={isFlipping}
                            style={{
                                flex: 1, padding: '10px 8px', fontSize: '0.85rem', fontWeight: 'bold',
                                background: '#111827', color: '#f3f4f6',
                                border: soloColor === 'b' ? '2px solid #6b7280' : '2px solid #374151',
                                outline: 'none', borderRadius: '12px', cursor: 'pointer',
                                transition: 'all 0.2s', opacity: soloColor === 'b' ? 1 : 0.45,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: soloColor === 'b' ? '0 0 12px rgba(107,114,128,0.35)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>將</span>
                            Đen (Hậu)
                        </button>
                    </div>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', marginTop: '1.2rem', opacity: isFlipping ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    <button className="btn-primary" onClick={handleStartSolo} disabled={isFlipping} style={{
                        padding: '13px', fontSize: '1.05rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '10px', fontWeight: 700,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
                        border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer'
                    }}>
                        <Gamepad size={20} /> Chơi Luyện Tập
                    </button>
                    <button className="btn-secondary" onClick={() => alert('Cờ Tướng Multiplayer đang phát triển!')} disabled={isFlipping} style={{
                        padding: '13px', fontSize: '1.05rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '10px', fontWeight: 600,
                        background: 'rgba(255,255,255,0.06)', color: '#ccc',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', cursor: 'pointer'
                    }}>
                        <Users size={18} /> Tìm Phòng Online
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/')} disabled={isFlipping} style={{
                        padding: '13px', fontSize: '1.05rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '10px', fontWeight: 600,
                        background: 'transparent', color: '#888',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer'
                    }}>
                        <ArrowLeft size={16} /> Về Sảnh GameOnl
                    </button>
                </div>

                {/* Random Color Overlay */}
                {isFlipping && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(10,10,16,0.88)', backdropFilter: 'blur(6px)', zIndex: 10
                    }}>
                        <h3 style={{ marginBottom: '1.2rem', color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem' }}>
                            🎲 Đang chọn phe...
                        </h3>
                        <div style={{
                            width: '90px', height: '90px', borderRadius: '50%',
                            background: assignedColor === 'w' ? '#fef2f2' : '#111827',
                            border: `4px solid ${assignedColor === 'w' ? '#ef4444' : '#6b7280'}`,
                            boxShadow: `0 0 30px ${assignedColor === 'w' ? 'rgba(239,68,68,0.6)' : 'rgba(107,114,128,0.5)'}`,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: assignedColor ? 'pulse-pop 0.4s ease-out' : 'pulse-glow 1.5s ease-in-out infinite'
                        }}>
                            <span style={{ fontSize: '3rem', color: assignedColor === 'w' ? '#ef4444' : '#9ca3af' }}>
                                {assignedColor === 'w' ? '帥' : '將'}
                            </span>
                        </div>
                        {assignedColor && (
                            <p style={{
                                marginTop: '1.1rem', fontWeight: 800, fontSize: '1rem',
                                color: assignedColor === 'w' ? '#ef4444' : '#9ca3af',
                                animation: 'fadeIn 0.5s ease-out'
                            }}>
                                Bạn chơi phe {assignedColor === 'w' ? 'ĐỎ (Tiên)' : 'ĐEN (Hậu)'}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.25); }
                    50% { box-shadow: 0 0 35px rgba(239,68,68,0.5); }
                }
                @keyframes pulse-pop {
                    0% { transform: scale(0.85); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
