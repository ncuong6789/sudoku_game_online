import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad, Grid3X3 } from 'lucide-react';

export default function SudokuHome() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem' }}>
            <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ width: '70px', height: '70px', background: '#3b82f6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)', marginTop: '0.5rem' }}>
                    <Grid3X3 size={40} color="#fff" />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    SUDOKU
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1rem' }}>
                    Rèn luyện tư duy logic qua những con số!
                </p>
            
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', marginBottom: '1.5rem' }}>
                    {/* Difficulty Selection */}
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Độ khó Solo:</p>
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
                </div>

                {/* Play Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                    <button className="btn-primary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)' }} onClick={() => navigate('/sudoku/solo', { state: { difficulty } })}>
                        <Gamepad size={22} /> Chơi Solo
                    </button>
                    <button className="btn-secondary" style={{ padding: '12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => navigate('/sudoku/multiplayer', { state: { autoCreate: true, difficulty } })}>
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
