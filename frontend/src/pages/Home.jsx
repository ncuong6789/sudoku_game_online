import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    return (
        <div className="glass-panel menu-container">
            <h1 style={{ margin: '0 0 1rem 0', padding: 0 }}>Sudoku</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Play Solo or Challenge Friends</p>
            <button className="btn-primary" onClick={() => navigate('/solo')}>Solo Mode</button>
            <button className="btn-secondary" onClick={() => navigate('/multiplayer')}>Multiplayer</button>
        </div>
    );
}
