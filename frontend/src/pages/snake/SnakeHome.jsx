import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Maximize, Play } from 'lucide-react';

export default function SnakeHome() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('solo');
    const [mapSize, setMapSize] = useState(20);

    const handleStart = () => {
        if (mode === 'solo') {
            navigate('/snake/game', { state: { mode: 'solo', mapSize } });
        } else {
            navigate('/snake/multiplayer', { state: { autoCreate: true, mapSize } });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        🐍 Rắn Săn Mồi
                    </h2>
                    <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px', width: 'auto', flexShrink: 0 }}>
                        <ArrowLeft size={16} /> Thoát
                    </button>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Chọn chế độ chơi</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div 
                            onClick={() => setMode('solo')}
                            style={{ 
                                flex: 1, padding: '1.5rem', borderRadius: '12px', cursor: 'pointer',
                                background: mode === 'solo' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `2px solid ${mode === 'solo' ? 'var(--primary-color, #4facfe)' : 'transparent'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <User size={32} color={mode === 'solo' ? '#4facfe' : '#94a3b8'} />
                            <span style={{ fontWeight: 'bold' }}>Solo (Huấn luyện)</span>
                        </div>
                        <div 
                            onClick={() => setMode('multiplayer')}
                            style={{ 
                                flex: 1, padding: '1.5rem', borderRadius: '12px', cursor: 'pointer',
                                background: mode === 'multiplayer' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `2px solid ${mode === 'multiplayer' ? 'var(--primary-color, #4facfe)' : 'transparent'}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Users size={32} color={mode === 'multiplayer' ? '#4facfe' : '#94a3b8'} />
                            <span style={{ fontWeight: 'bold' }}>Multiplayer (PvP)</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Maximize size={18} /> Kích thước Bản đồ
                    </h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[20, 30].map(size => (
                            <button
                                key={size}
                                onClick={() => setMapSize(size)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: mapSize === size ? 'var(--primary-color, #4facfe)' : 'rgba(255,255,255,0.1)',
                                    color: mapSize === size ? '#fff' : 'var(--text-secondary)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {size} x {size}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn-primary" onClick={handleStart} style={{ padding: '15px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <Play size={20} /> {mode === 'solo' ? 'Bắt Đầu Solo' : 'Tạo phòng & Chờ bạn bè'}
                </button>

            </div>
        </div>
    );
}
