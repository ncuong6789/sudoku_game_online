import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, ArrowLeft, Gamepad, Lock, Map } from 'lucide-react';

export default function PacmanHome() {
    const navigate = useNavigate();
    const [mapType, setMapType] = useState('Classic');

    const MAP_INFO = {
        Classic: 'Bản đồ Pac-Man arcade huyền thoại.',
        Prototype: 'Phiên bản thử nghiệm với cấu trúc lạ và khó lường.',
        MsMap1: 'Ms. Pac-Man: Bản đồ màu hồng với lối đi rộng.',
        MsMap2: 'Ms. Pac-Man: Mê cung xanh có nhiều đường hầm liên thông.',
        MsMap3: 'Ms. Pac-Man: Thiết kế đối xứng phức tạp, đầy thử thách.',
        MsMap4: 'Ms. Pac-Man: Bản đồ cuối cùng với độ khó cực cao.'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '2.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
                    <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={18} /> Về Home
                    </button>
                </div>

                <div style={{ width: '80px', height: '80px', background: 'var(--accent-color)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)', marginTop: '2rem' }}>
                    <Ghost size={45} color="#000" />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    PAC-MAN
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '1.1rem' }}>
                    Săn đuổi và trốn chạy trong mê cung vô tận!
                </p>

                {/* Map Type Selection */}
                <div style={{ width: '100%', marginBottom: '2.5rem' }}>
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
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', minHeight: '3em', margin: '0.5rem 0' }}>
                        {MAP_INFO[mapType]}
                    </p>
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/pacman/game', { state: { mapType } })}
                        style={{ padding: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(74, 222, 128, 0.3)' }}
                    >
                        <Gamepad size={24} /> Chơi Ngay
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ padding: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <ArrowLeft size={20} /> Quay lại Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
