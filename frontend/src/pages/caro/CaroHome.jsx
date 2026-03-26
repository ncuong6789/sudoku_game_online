import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CaroHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div className="glass-panel menu-container">
            <h1 style={{ margin: '0 0 1rem 0', padding: 0 }}>Caro</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Thử thách trí tuệ (15x15)</p>
            
            {/* Solo Mode Section */}
            <div style={{ width: '100%', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', textAlign: 'left' }}>Chơi Solo</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <select 
                        className="glass-input" 
                        value={difficulty} 
                        onChange={(e) => setDifficulty(e.target.value)}
                        style={{ padding: '12px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <option value="Easy">Dễ (Học chơi)</option>
                        <option value="Medium">Vừa (Thử thách)</option>
                        <option value="Hard">Khó (Chuyên nghiệp)</option>
                    </select>
                    <button className="btn-primary" onClick={() => navigate('/caro/game', { state: { mode: 'solo', difficulty } })}>
                        Bắt đầu Solo
                    </button>
                </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '2rem' }}></div>

            {/* Multiplayer Section */}
            <div style={{ width: '100%' }}>
                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/caro/multiplayer')}>
                    Chơi Multiplayer (Online)
                </button>
            </div>

            <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', opacity: 0.7 }} onClick={() => navigate('/')}>
                Quay lại Hub
            </button>
        </div>
    );
}
