import React from 'react';
import { useNavigate } from 'react-router-dom';

const games = [
    {
        id: 'sudoku',
        name: 'Sudoku',
        description: 'Classic logic puzzle with multiplayer challenge.',
        image: '/assets/images/sudoku.png',
        path: '/sudoku',
        status: 'Live'
    },
    {
        id: 'caro',
        name: 'Caro (Gomoku)',
        description: 'Five in a row strategy game. Play vs Friends.',
        image: '/assets/images/caro.png',
        path: '/caro',
        status: 'Coming Soon'
    },
    {
        id: 'chess',
        name: 'Chess',
        description: 'The ultimate game of kings. Realtime multiplayer.',
        image: '/assets/images/chess.png',
        path: '/chess',
        status: 'Coming Soon'
    }
];

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="glass-panel menu-container">
            <h1 style={{ 
                fontSize: '3rem', 
                fontWeight: '800', 
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, #fff 0%, var(--primary-color) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                GameOn
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                Multiplayer Strategy Platform
            </p>

            <div className="game-grid">
                {games.map(game => (
                    <div 
                        key={game.id} 
                        className={`game-card ${game.status === 'Coming Soon' ? 'coming-soon' : ''}`}
                        style={{ backgroundImage: `url(${game.image})` }}
                        onClick={() => game.status !== 'Coming Soon' && navigate(game.path)}
                    >
                        <div className="status-badge">{game.status}</div>
                        <div className="game-card-content">
                            <h3>{game.name}</h3>
                            <p>{game.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <footer style={{ marginTop: '3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Connect with friends and compete in real-time.
            </footer>
        </div>
    );
}
