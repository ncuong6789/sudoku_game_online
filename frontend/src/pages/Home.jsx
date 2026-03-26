import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Grid3X3, Swords, Trophy, Users, X, Activity } from 'lucide-react';
import { socket } from '../utils/socket';

const games = {
    sudoku: {
        id: 'sudoku',
        name: 'Sudoku',
        description: 'Trò chơi giải đố logic cổ điển. Điền các số vào lưới sao cho không trùng lặp trong hàng, cột và vùng 3x3.',
        path: '/sudoku',
        difficulty: 'Vừa',
        instructions: [
            'Điền các số từ 1 đến 9 vào các ô trống.',
            'Mỗi hàng ngang, cột dọc và vùng 3x3 phải có đủ các số từ 1 đến 9 không trùng lặp.'
        ]
    },
    caro: {
        id: 'caro',
        name: 'Tic-Tac-Toe',
        description: 'Trận chiến trí tuệ trên bàn cờ 15x15. Xếp đủ 5 quân cờ liên tiếp theo hàng ngang, dọc hoặc chéo để giành chiến thắng.',
        path: '/caro',
        difficulty: 'Cao',
        instructions: [
            'Thay phiên nhau đặt quân X và O vào bàn cờ 15x15.',
            'Mục tiêu: Tạo thành một hàng gồm 5 quân cờ của mình liên tiếp (ngang, dọc hoặc chéo).'
        ]
    },
    chess: {
        id: 'chess',
        name: 'Chess',
        description: 'Đỉnh cao của chiến thuật quân sự trên bàn cờ 8x8. Điều khiển quân đội của bạn để chiếu bí vua đối phương.',
        path: '/chess',
        difficulty: 'Rất cao',
        instructions: [
            'Cờ vua là trò chơi chiến thuật giữa hai người chơi.',
            'Mỗi quân cờ có cách di chuyển riêng. Mục tiêu là chiếu bí Vua đối phương.'
        ]
    },
    snake: {
        id: 'snake',
        name: 'Snake',
        description: 'Sinh tồn trên bản đồ lưới (20x20 hoặc 30x30). Điều khiển Rắn ăn mồi để tăng kích thước và tốc độ. Đối đầu Multiplayer kịch tính!',
        path: '/snake',
        difficulty: 'Tuỳ chỉnh',
        instructions: [
            'Sử dụng 4 phím mũi tên (Lên, Xuống, Trái, Phải) để di chuyển hướng đi.',
            'Ăn mồi sẽ tăng 2 kích thước (đốt) và tăng tốc độ rắn.',
            'Trong Multiplay, chạm vào tường, vào bản thân hoặc đối thủ sẽ chết. Rắn chết biến thành chướng ngại vật!'
        ]
    },
    tetris: {
        id: 'tetris',
        name: 'Tetris',
        description: 'Trò chơi xếp gạch huyền thoại (Block Puzzle). Xoay và xếp các khối gạch rơi xuống để lấp đầy hàng. Đối đầu trực tiếp Multiplayer - Điểm cao nhất thắng!',
        path: '/tetris',
        difficulty: 'Vừa',
        instructions: [
            'Sử dụng Mũi tên TRÁI/PHẢI để di chuyển khối, XUỐNG để tăng tốc.',
            'Mũi tên LÊN để xoay khối, Dấu CÁCH (Space) để thả thẳng phi thuyền cứng (Hard Drop).',
            'Hoàn thành một hàng ngang để ghi điểm. Màn hình đụng trần là Xong!'
        ]
    }
};

export default function Home() {
    const navigate = useNavigate();
    // Persistence: Get last active game from localStorage
    const [activeGame, setActiveGame] = useState(() => localStorage.getItem('lastGame') || 'sudoku');
    const [showHelp, setShowHelp] = useState(false);
    const [stats, setStats] = useState({ online: 0, rooms: 0 });

    const game = games[activeGame];

    useEffect(() => {
        localStorage.setItem('lastGame', activeGame);
        socket.emit('getStats');
        const handleStats = (data) => {
            if (data[activeGame]) setStats(data[activeGame]);
            else setStats({ online: 0, rooms: 0 });
        };
        socket.on('statsUpdate', handleStats);
        return () => socket.off('statsUpdate', handleStats);
    }, [activeGame]);

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="sidebar-logo">GameOn</div>
                <nav className="nav-group">
                    <div className={`nav-item ${activeGame === 'sudoku' ? 'active' : ''}`} onClick={() => { setActiveGame('sudoku'); setShowHelp(false); }}>
                        <Grid3X3 size={20} /> Sudoku
                    </div>
                    <div className={`nav-item ${activeGame === 'caro' ? 'active' : ''}`} onClick={() => { setActiveGame('caro'); setShowHelp(false); }}>
                        <Swords size={20} /> Tic-Tac-Toe
                    </div>
                    <div className={`nav-item ${activeGame === 'chess' ? 'active' : ''}`} onClick={() => { setActiveGame('chess'); setShowHelp(false); }}>
                        <LayoutGrid size={20} /> Chess
                    </div>
                    <div className={`nav-item ${activeGame === 'snake' ? 'active' : ''}`} onClick={() => { setActiveGame('snake'); setShowHelp(false); }}>
                        <Activity size={20} /> Snake
                    </div>
                    <div className={`nav-item ${activeGame === 'tetris' ? 'active' : ''}`} onClick={() => { setActiveGame('tetris'); setShowHelp(false); }}>
                        <Grid3X3 size={20} /> Tetris
                    </div>
                </nav>
                <div className="nav-group" style={{ marginTop: '1rem', flex: 'none' }}>
                    <div className="nav-item"><Trophy size={20} /> Xếp hạng</div>
                    <div className="nav-item"><Users size={20} /> Bạn bè</div>
                </div>
                <div className="sidebar-footer">GameOn v1.2</div>
            </aside>

            <main className="main-content" style={{ padding: '2rem' }}>
                <div className="game-detail" style={{ maxWidth: '700px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h1 className="game-title" style={{ margin: 0, fontSize: '3rem' }}>{game.name}</h1>
                    </div>
                    <p className="game-desc" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{game.description}</p>

                    <div className="action-row" style={{ marginBottom: '2rem', gap: '0.8rem' }}>
                        <button className={!showHelp ? "btn-primary" : "btn-secondary"} onClick={() => showHelp ? setShowHelp(false) : navigate(game.path)} style={{ flex: 1, padding: '14px' }}>
                            Bắt đầu chơi
                        </button>
                        <button className={showHelp ? "btn-primary" : "btn-secondary"} onClick={() => setShowHelp(!showHelp)} style={{ flex: 1, padding: '14px' }}>
                            Hướng dẫn
                        </button>
                    </div>

                    {showHelp && (
                        <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                <h3 style={{ margin: 0 }}>Cách chơi {game.name}</h3>
                                <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowHelp(false)} />
                            </div>
                            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                {game.instructions.map((ins, idx) => <li key={idx} style={{ marginBottom: '0.4rem' }}>{ins}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="stats-grid" style={{ gap: '1rem' }}>
                        <div className="stat-card" style={{ padding: '1.2rem' }}>
                            <span className="stat-label">Người chơi Online</span>
                            <span className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.online}</span>
                        </div>
                        <div className="stat-card" style={{ padding: '1.2rem' }}>
                            <span className="stat-label">Phòng đang mở</span>
                            <span className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.rooms}</span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.2rem', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Bạn bè trực tuyến</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Hiện không có ai trực tuyến.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
