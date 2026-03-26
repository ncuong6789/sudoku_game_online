import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CaroHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div className="glass-panel menu-container">
            <h1 style={{ margin: '0 0 1rem 0', padding: 0 }}>Caro</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Thử thách trí tuệ (15x15)</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
                    {['Easy', 'Medium', 'Hard'].map((d) => (
                        <button 
                            key={d}
                            className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => setDifficulty(d)}
                            style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                        >
                            {d === 'Easy' ? 'Dễ' : d === 'Medium' ? 'Vừa' : 'Khó'}
                        </button>
                    ))}
                </div>
                
                <button className="btn-primary" onClick={() => navigate('/caro/game', { state: { mode: 'solo', difficulty } })}>
                    Chế độ Solo
                </button>
                <button className="btn-secondary" onClick={() => navigate('/caro/multiplayer')}>
                    Chế độ Multiplayer
                </button>
                <button className="btn-secondary" style={{ marginTop: '1rem', opacity: 0.7 }} onClick={() => navigate('/')}>
                    Quay lại Hub
                </button>
            </div>
        </div>
    );
}
