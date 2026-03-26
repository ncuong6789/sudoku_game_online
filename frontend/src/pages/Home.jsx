import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Binary, Grid3X3, Swords, Trophy, Users, Info } from 'lucide-react';

const games = {
    sudoku: {
        id: 'sudoku',
        name: 'Sudoku',
        description: 'Trò chơi giải đố logic cổ điển. Điền các số từ 1 đến 9 vào lưới sao cho mỗi hàng, mỗi cột và mỗi vùng 3x3 đều chứa đầy đủ các chữ số.',
        path: '/sudoku',
        status: 'Trực tuyến',
        stats: { online: 12, played: '1.2k', difficulty: 'Vừa' }
    },
    caro: {
        id: 'caro',
        name: 'Caro (Gomoku)',
        description: 'Trận chiến trí tuệ trên bàn cờ 15x15. Xếp đủ 5 quân cờ liên tiếp theo hàng ngang, dọc hoặc chéo để giành chiến thắng.',
        path: '/caro',
        status: 'Mới',
        stats: { online: 8, played: '450', difficulty: 'Cao' }
    },
    chess: {
        id: 'chess',
        name: 'Cờ vua',
        description: 'Đỉnh cao của chiến thuật quân sự trên bàn cờ 8x8. Điều khiển quân đội của bạn để chiếu bí vua đối phương.',
        path: '/chess',
        status: 'Sắp ra mắt',
        stats: { online: 0, played: '0', difficulty: 'Rất cao' }
    }
};

export default function Home() {
    const navigate = useNavigate();
    const [activeGame, setActiveGame] = useState('sudoku');

    const game = games[activeGame];

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">GameOn</div>
                
                <nav className="nav-group">
                    <div 
                        className={`nav-item ${activeGame === 'sudoku' ? 'active' : ''}`}
                        onClick={() => setActiveGame('sudoku')}
                    >
                        <Grid3X3 size={20} /> Sudoku
                    </div>
                    <div 
                        className={`nav-item ${activeGame === 'caro' ? 'active' : ''}`}
                        onClick={() => setActiveGame('caro')}
                    >
                        <Swords size={20} /> Caro 15x15
                    </div>
                    <div 
                        className={`nav-item ${activeGame === 'chess' ? 'active' : ''}`}
                        onClick={() => setActiveGame('chess')}
                    >
                        <LayoutGrid size={20} /> Cờ vua
                    </div>
                </nav>

                <div className="nav-group" style={{ marginTop: '2rem', flex: 'none' }}>
                    <div className="nav-item"><Trophy size={20} /> Xếp hạng</div>
                    <div className="nav-item"><Users size={20} /> Bạn bè</div>
                </div>

                <div className="sidebar-footer">
                    GameOn v1.1 <br/> Platform đa trò chơi
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="game-detail">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h1 className="game-title">{game.name}</h1>
                        {game.status === 'Sắp ra mắt' && <span className="coming-soon-tag">Coming Soon</span>}
                    </div>
                    
                    <p className="game-desc">{game.description}</p>

                    <div className="action-row">
                        {game.status !== 'Sắp ra mắt' ? (
                            <>
                                <button className="btn-primary" onClick={() => navigate(game.path)}>
                                    Bắt đầu chơi
                                </button>
                                <button className="btn-secondary">
                                    Hướng dẫn
                                </button>
                            </>
                        ) : (
                            <button className="btn-secondary" disabled>
                                Đang phát triển...
                            </button>
                        )}
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label">Người chơi đang online</span>
                            <span className="stat-value">{game.stats.online}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Đã chơi (24h)</span>
                            <span className="stat-value">{game.stats.played}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Độ khó</span>
                            <span className="stat-value">{game.stats.difficulty}</span>
                        </div>
                    </div>

                    {/* Quick Friends Section Placeholder */}
                    <div className="glass-panel" style={{ marginTop: '3rem', padding: '1.5rem', width: '100%', borderRadius: '16px' }}>
                        <h3>Bạn bè đang hoạt động</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chưa có bạn bè nào đang chơi.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
