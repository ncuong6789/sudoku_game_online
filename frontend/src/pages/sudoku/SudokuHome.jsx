import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SudokuHome() {
    const navigate = useNavigate();
    return (
        <div className="glass-panel menu-container">
            <h1 style={{ margin: '0 0 1rem 0', padding: 0 }}>Sudoku</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Classic Logic Puzzle</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <button className="btn-primary" onClick={() => navigate('/sudoku/solo')}>Solo Mode</button>
                <button className="btn-secondary" onClick={() => navigate('/sudoku/multiplayer')}>Multiplayer</button>
                <button className="btn-secondary" style={{ marginTop: '1rem', opacity: 0.7 }} onClick={() => navigate('/')}>Back to Hub</button>
            </div>
        </div>
    );
}
