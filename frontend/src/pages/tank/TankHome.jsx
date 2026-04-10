import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Gamepad, Users, Shield, Zap, Swords, Map, ChevronDown, ChevronUp } from 'lucide-react';

const DIFF_INFO = {
    easy: {
        label: 'Tân Binh',
        icon: <Shield size={16} />,
        color: '#4ade80',
        glow: 'rgba(74,222,128,0.35)',
        desc: 'Xe tăng địch di chuyển chậm và bắn ít hơn. Máu của bạn cao hơn.',
    },
    medium: {
        label: 'Chiến Binh',
        icon: <Zap size={16} />,
        color: '#fbbf24',
        glow: 'rgba(251,191,36,0.35)',
        desc: 'Tốc độ tiêu chuẩn. Độ khó cân bằng giữa tấn công và phòng thủ.',
    },
    hard: {
        label: 'Huyền Thoại',
        icon: <Swords size={16} />,
        color: '#ef4444',
        glow: 'rgba(239,68,68,0.35)',
        desc: 'Kẻ địch hung hãn, bắn nhanh và bao vây.',
    },
};

const MAX_LEVEL = 36;

export default function TankHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('medium');
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [showMapSelect, setShowMapSelect] = useState(false);

    const selectedDiff = DIFF_INFO[difficulty];

    const handleLevelSelect = (level) => {
        setSelectedLevel(level);
        setShowMapSelect(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)' }}>
                        <Target size={36} color="#fff" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none', lineHeight: 1 }}>
                            TANK WARS
                        </h1>
                        <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 800, letterSpacing: '4px', marginTop: '4px' }}>
                            BATTLE CITY
                        </span>
                    </div>
                </div>

                {/* Map/Level Selection - Compact Dropdown */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Map size={18} /> Chọn Màn Chơi
                    </label>
                    
                    <button
                        onClick={() => setShowMapSelect(!showMapSelect)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '2px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>Màn {selectedLevel} / {MAX_LEVEL}</span>
                        {showMapSelect ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {showMapSelect && (
                        <div style={{
                            marginTop: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '8px'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => handleLevelSelect(level)}
                                        style={{
                                            padding: '8px 4px',
                                            borderRadius: '8px',
                                            background: selectedLevel === level 
                                                ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                                                : 'rgba(255,255,255,0.05)',
                                            border: 'none',
                                            color: selectedLevel === level ? '#fff' : '#aaa',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Difficulty Selection */}
                <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Target size={18} /> Cấp Độ Thử Thách
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
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }} onClick={() => navigate('/tank/game', { state: { roomId: 'local', mode: 'single', difficulty, level: selectedLevel } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/tank/multiplayer', { state: { autoCreate: true, difficulty, level: selectedLevel } })}>
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
