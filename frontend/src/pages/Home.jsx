import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Binary, Grid3X3, Swords, Trophy, Users, Info, X } from 'lucide-react';
import { socket } from '../utils/socket';

const games = {
    sudoku: {
        id: 'sudoku',
        name: 'Sudoku',
        description: 'Trò chơi giải đố logic cổ điển. Điền các số từ 1 đến 9 vào lưới sao cho mỗi hàng, mỗi cột và mỗi vùng 3x3 đều chứa đầy đủ các chữ số.',
        path: '/sudoku',
        difficulty: 'Vừa',
        instructions: [
            'Điền các số từ 1 đến 9 vào các ô trống.',
            'Mỗi hàng ngang phải có đủ các số từ 1 đến 9 không trùng lặp.',
            'Mỗi cột dọc phải có đủ các số từ 1 đến 9 không trùng lặp.',
            'Mỗi vùng 3x3 (có viền đậm) phải có đủ các số từ 1 đến 9 không trùng lặp.'
        ]
    },
    caro: {
        id: 'caro',
        name: 'Caro',
        description: 'Trận chiến trí tuệ trên bàn cờ 15x15. Xếp đủ 5 quân cờ liên tiếp theo hàng ngang, dọc hoặc chéo để giành chiến thắng.',
        path: '/caro',
        difficulty: 'Cao',
        instructions: [
            'Người chơi thay phiên nhau đặt quân X và O vào các ô trống trên bàn cờ 15x15.',
            'Mục tiêu là tạo thành một hàng gồm 5 quân cờ của mình theo hàng ngang, dọc hoặc chéo.',
            'Người đầu tiên đạt được chuỗi 5 quân liên tiếp sẽ giành chiến thắng.'
        ]
    },
    chess: {
        id: 'chess',
        name: 'Cờ vua',
        description: 'Đỉnh cao của chiến thuật quân sự trên bàn cờ 8x8. Điều khiển quân đội của bạn để chiếu bí vua đối phương.',
        path: '/chess',
        difficulty: 'Rất cao',
        instructions: [
            'Cờ vua là trò chơi chiến thuật giữa hai người chơi.',
            'Mỗi loại quân có cách di chuyển riêng (Xe, Mã, Tượng, Hậu, Vua, Tốt).',
            'Mục tiêu cuối cùng là Chiếu bí (Checkmate) Vua của đối phương.'
        ]
    }
};

export default function Home() {
    const navigate = useNavigate();
    const [activeGame, setActiveGame] = useState('sudoku');
    const [showHelp, setShowHelp] = useState(false);
    const [stats, setStats] = useState({ online: 0, rooms: 0 });

    const game = games[activeGame];

    useEffect(() => {
        // Request real stats from backend
        socket.emit('getStats');
        const handleStats = (data) => {
            if (data[activeGame]) {
                setStats(data[activeGame]);
            } else {
                setStats({ online: 0, rooms: 0 });
            }
        };
        socket.on('statsUpdate', handleStats);
        return () => socket.off('statsUpdate', handleStats);
    }, [activeGame]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">GameOn</div>
                
                <nav className="nav-group">
                    <div 
                        className={`nav-item ${activeGame === 'sudoku' ? 'active' : ''}`}
                        onClick={() => { setActiveGame('sudoku'); setShowHelp(false); }}
                    >
                        <Grid3X3 size={20} /> Sudoku
                    </div>
                    <div 
                        className={`nav-item ${activeGame === 'caro' ? 'active' : ''}`}
                        onClick={() => { setActiveGame('caro'); setShowHelp(false); }}
                    >
                        <Swords size={20} /> Caro
                    </div>
                    <div 
                        className={`nav-item ${activeGame === 'chess' ? 'active' : ''}`}
                        onClick={() => { setActiveGame('chess'); setShowHelp(false); }}
                    >
                        <LayoutGrid size={20} /> Cờ vua
                    </div>
                </nav>

                <div className="nav-group" style={{ marginTop: '2rem', flex: 'none' }}>
                    <div className="nav-item"><Trophy size={20} /> Xếp hạng</div>
                    <div className="nav-item"><Users size={20} /> Bạn bè</div>
                </div>

                <div className="sidebar-footer">
                    GameOn v1.2 <br/> Platform đa trò chơi
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="game-detail">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h1 className="game-title">{game.name}</h1>
                        {activeGame === 'chess' && <span className="coming-soon-tag">Sắp ra mắt</span>}
                    </div>
                    
                    <p className="game-desc">{game.description}</p>

                    <div className="action-row">
                        {activeGame !== 'chess' ? (
                            <>
                                <button className="btn-primary" onClick={() => navigate(game.path)}>
                                    Bắt đầu chơi
                                </button>
                                <button className="btn-secondary" onClick={() => setShowHelp(!showHelp)}>
                                    {showHelp ? 'Đóng hướng dẫn' : 'Hướng dẫn'}
                                </button>
                            </>
                        ) : (
                            <button className="btn-secondary" disabled>
                                Đang phát triển...
                            </button>
                        )}
                    </div>

                    {showHelp && (
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Cách chơi {game.name}</h3>
                                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowHelp(false)} />
                            </div>
                            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {game.instructions.map((ins, idx) => (
                                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{ins}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label">Người chơi Online</span>
                            <span className="stat-value">{stats.online}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Phòng đang mở</span>
                            <span className="stat-value">{stats.rooms}</span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ marginTop: '3rem', padding: '1.5rem', width: '100%', borderRadius: '16px' }}>
                        <h3>Bạn bè đang trực tuyến</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chưa có bạn bè nào đang chơi.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
