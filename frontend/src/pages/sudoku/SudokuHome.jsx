import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SudokuHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h1 style={{ margin: '0 0 1rem 0', padding: 0, whiteSpace: 'nowrap', userSelect: 'none' }}>Sudoku</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                {/* Difficulty Selection */}
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Chọn độ khó:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        {['Easy', 'Medium', 'Hard', 'Expert'].map(d => (
                            <button
                                key={d}
                                className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setDifficulty(d)}
                                style={{ padding: '10px', fontSize: '0.9rem' }}
                            >
                                {d === 'Easy' ? '😊 Dễ' : d === 'Medium' ? '🤔 Vừa' : d === 'Hard' ? '😤 Khó' : '🔥 Expert'}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn-primary" style={{ padding: '14px' }} onClick={() => navigate('/sudoku/solo', { state: { difficulty } })}>Solo Mode</button>
                <button className="btn-secondary" style={{ padding: '14px' }} onClick={() => navigate('/sudoku/multiplayer', { state: { autoCreate: true, difficulty } })}>
                    Tạo phòng Online
                </button>
                
                <button className="btn-secondary" style={{ marginTop: '0.5rem', opacity: 0.7, width: 'auto' }} onClick={() => navigate('/')}>Back to Hub</button>
            </div>
        </div>
    );
}
