import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Swords, Smile, Star, Flame } from 'lucide-react';

const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '20x20', value: 20 }
];

const DIFF_INFO = {
    Easy: {
        label: 'Dễ',
        icon: <Smile size={16} />,
        color: '#22c55e',
        glow: 'rgba(34,197,94,0.35)',
        desc: 'AI suy nghĩ nông. Dễ dàng vượt qua.',
    },
    Medium: {
        label: 'Thường',
        icon: <Star size={16} />,
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.35)',
        desc: 'AI cân bằng giữa tấn công và phòng thủ.',
    },
    Expert: {
        label: 'Expert',
        icon: <Flame size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'AI đọc trước nhiều nước. Rất khó thắng!',
    },
};

export default function CaroHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [gridSize, setGridSize] = useState(15);

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#14b8a6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(20, 184, 166, 0.3)' }}>
                        <Swords size={36} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        CARO
                    </h1>
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Flame size={18} /> Độ Khó AI
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

                {/* Grid Size */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Kích Thước Bàn Cờ
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {sizes.map((s) => (
                            <button
                                key={s.label}
                                className={gridSize === s.value ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setGridSize(s.value)}
                                style={{ padding: '12px 10px', fontSize: '0.9rem' }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(20, 184, 166, 0.3)' }} onClick={() => navigate('/caro/game', { state: { mode: 'solo', difficulty, gridSize } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/caro/multiplayer', { state: { autoCreate: true, gridSize } })}>
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
