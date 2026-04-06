import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Gamepad, Map, Zap, Shield, Swords } from 'lucide-react';

export default function TankHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('medium');

    const DIFF_INFO = {
        easy: {
            label: 'Tân Binh',
            icon: <Shield size={16} />,
            color: '#4ade80',
            glow: 'rgba(74,222,128,0.2)',
            desc: 'Xe tăng địch di chuyển chậm và bắn ít hơn. Máu của bạn cao hơn.',
        },
        medium: {
            label: 'Chiến Binh',
            icon: <Zap size={16} />,
            color: '#fbbf24',
            glow: 'rgba(251,191,36,0.2)',
            desc: 'Tốc độ tiêu chuẩn. Độ khó cân bằng giữa tấn công và phòng thủ.',
        },
        hard: {
            label: 'Huyền Thoại',
            icon: <Swords size={16} />,
            color: '#ef4444',
            glow: 'rgba(239,68,68,0.2)',
            desc: 'Kẻ địch cực kỳ hung hãn, bắn nhanh và sử dụng chiến thuật bao vây.',
        },
    };

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                padding: '2rem', 
                width: '100%', 
                maxWidth: '600px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>

                {/* Header with Icon */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', marginBottom: '1.5rem' }}>
                    <div style={{ 
                        width: '70px', 
                        height: '70px', 
                        background: 'var(--accent-color)', 
                        borderRadius: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' 
                    }}>
                        <Target size={42} color="#000" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ 
                            fontSize: '2.8rem', 
                            margin: 0, 
                            lineHeight: 1,
                            background: 'linear-gradient(135deg, #fff, #60a5fa)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent', 
                            fontWeight: 900,
                            letterSpacing: '-1px'
                        }}>
                            TANK WARS
                        </h1>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>
                            BATTLE CITY ONLINE
                        </span>
                    </div>
                </div>

                {/* Game Description */}
                <p style={{ 
                    fontSize: '1rem', 
                    color: 'var(--text-secondary)', 
                    textAlign: 'center', 
                    lineHeight: '1.6', 
                    marginBottom: '2rem',
                    maxWidth: '450px'
                }}>
                    Trải nghiệm cảm giác bắn tăng cổ điển với chế độ chơi nhiều người. Tiêu diệt xe tăng đối phương để thống trị chiến trường!
                </p>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Zap size={16} /> Lựa chọn độ khó
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                        {Object.entries(DIFF_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                style={{
                                    padding: '12px 0',
                                    borderRadius: '14px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: difficulty === key ? `${info.color}15` : 'rgba(255,255,255,0.03)',
                                    color: difficulty === key ? info.color : 'var(--text-secondary)',
                                    border: `1px solid ${difficulty === key ? info.color : 'rgba(255,255,255,0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: difficulty === key ? `0 0 20px ${info.glow}` : 'none',
                                    transform: difficulty === key ? 'translateY(-2px)' : 'none'
                                }}
                            >
                                {info.icon}
                                {info.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ 
                        fontSize: '0.82rem', 
                        color: 'rgba(255,255,255,0.5)', 
                        textAlign: 'center', 
                        padding: '10px 20px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '10px',
                        minHeight: '3.5em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {selectedDiff.desc}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px' }}>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/tank/game', { state: { roomId: 'local', mode: 'single', difficulty } })}
                        style={{
                            padding: '14px', fontSize: '1.1rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <Gamepad size={22} /> CHƠI NGAY (SOLO)
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ padding: '14px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <ArrowLeft size={18} /> QUAY LẠI TRANG CHỦ
                    </button>
                    
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '0.5rem' }}>
                        * Để chơi Multiplayer, hãy sử dụng tính năng Tìm trận tại sảnh Hub.
                    </p>
                </div>
            </div>
        </div>
    );
}
