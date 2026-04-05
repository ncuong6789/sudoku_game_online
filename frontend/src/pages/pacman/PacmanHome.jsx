import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, ArrowLeft, Gamepad, Map, Zap, Flame } from 'lucide-react';

export default function PacmanHome() {
    const navigate = useNavigate();
    const [mapType, setMapType] = useState(() => localStorage.getItem('pacmanMap') || 'Classic');
    const [difficulty, setDifficulty] = useState(() => localStorage.getItem('pacmanDiff') || 'medium'); // 'medium' | 'hard'

    useEffect(() => {
        localStorage.setItem('pacmanMap', mapType);
    }, [mapType]);

    useEffect(() => {
        localStorage.setItem('pacmanDiff', difficulty);
    }, [difficulty]);

    const MAP_INFO = {
        Classic: 'Bản đồ Pac-Man arcade huyền thoại.',
        Prototype: 'Phiên bản thử nghiệm với cấu trúc lạ và khó lường.',
        MsMap1: 'Ms. Pac-Man: Bản đồ màu hồng với lối đi rộng.',
        MsMap2: 'Ms. Pac-Man: Mê cung xanh có nhiều đường hầm liên thông.',
        MsMap3: 'Ms. Pac-Man: Thiết kế đối xứng phức tạp, đầy thử thách.',
        MsMap4: 'Ms. Pac-Man: Bản đồ cuối cùng với độ khó cực cao.'
    };

    const DIFF_INFO = {
        medium: {
            label: 'Trung Bình',
            icon: <Zap size={16} />,
            color: '#f59e0b',
            glow: 'rgba(245,158,11,0.35)',
            desc: 'Cứ 20% chấm ăn được → 1 con ma mới xuất hiện. Ra hết sau 60%.',
        },
        hard: {
            label: 'Khó',
            icon: <Flame size={16} />,
            color: '#ef4444',
            glow: 'rgba(239,68,68,0.35)',
            desc: 'Cứ 10% chấm ăn được → 1 con ma mới xuất hiện. Ra hết sau 30%.',
        },
    };

    const selectedDiff = DIFF_INFO[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--accent-color)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)' }}>
                        <Ghost size={36} color="#000" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        PAC-MAN
                    </h1>
                </div>

                {/* Map Type Selection */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Map size={18} /> Chọn Bản Đồ
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                        {Object.keys(MAP_INFO).map((type) => (
                            <button
                                key={type}
                                onClick={() => setMapType(type)}
                                style={{
                                    padding: '10px 5px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                                    background: mapType === type ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                                    color: mapType === type ? '#000' : 'var(--text-primary)',
                                    border: `2px solid ${mapType === type ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: mapType === type ? '0 0 15px rgba(74, 222, 128, 0.4)' : 'none'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', minHeight: '1.5em', margin: '0.3rem 0' }}>
                        {MAP_INFO[mapType]}
                    </p>
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Flame size={18} /> Độ Khó
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {Object.entries(DIFF_INFO).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                style={{
                                    padding: '12px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    display: 'flex',
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
                                {info.icon} {info.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/pacman/game', { state: { mapType, difficulty } })}
                        style={{
                            padding: '12px', fontSize: '1.1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            boxShadow: '0 6px 20px rgba(74, 222, 128, 0.3)'
                        }}
                    >
                        <Gamepad size={22} /> Chơi Ngay
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <ArrowLeft size={18} /> Quay lại Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
