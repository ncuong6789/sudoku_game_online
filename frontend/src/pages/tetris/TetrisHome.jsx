import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Layers, Smile, Star, Flame } from 'lucide-react';

const DIFF_INFO = {
    Easy: {
        label: 'Chậm',
        icon: <Smile size={16} />,
        color: '#22c55e',
        glow: 'rgba(34,197,94,0.35)',
        desc: 'Khối rơi chậm. Phù hợp người mới bắt đầu.',
    },
    Medium: {
        label: 'Vừa',
        icon: <Star size={16} />,
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.35)',
        desc: 'Tốc độ cân bằng. Thử thách vừa phải.',
    },
    Expert: {
        label: 'Nhanh',
        icon: <Flame size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'Khối rơi nhanh. Phản xạ cao thủ!',
    },
};

export default function TetrisHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#d946ef', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(217, 70, 239, 0.3)' }}>
                        <Layers size={36} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #a855f7, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        TETRIS
                    </h1>
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Flame size={18} /> Tốc Độ Khởi Điểm
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {Object.entries(DIFF_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                style={{
                                    padding: '14px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    background: difficulty === key
                                        ? `linear-gradient(135deg, ${info.color}33, ${info.color}22)`
                                        : 'rgba(255,255,255,0.05)',
                                    color: difficulty === key ? info.color : 'var(--text-secondary)',
                                    border: `2px solid ${difficulty === key ? info.color : 'rgba(255,255,255,0.1)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: difficulty === key ? `0 0 18px ${info.glow}` : 'none',
                                }}
                            >
                                {info.icon}
                                <span>{info.label}</span>
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: selectedDiff.color, textAlign: 'center', minHeight: '1.5em', margin: '0.3rem 0', opacity: 0.85 }}>
                        {selectedDiff.desc}
                    </p>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)' }} onClick={() => navigate('/tetris/game', { state: { mode: 'solo', difficulty } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/tetris/multiplayer', { state: { autoCreate: true, difficulty } })}>
                        <Users size={22} /> Tạo phòng Online
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
