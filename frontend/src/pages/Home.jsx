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
    const [matchmakingReady, setMatchmakingReady] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [searchMode, setSearchMode] = useState('active'); // 'active' (selected game) or 'random' (random game)


    const game = games[activeGame];

    useEffect(() => {
        localStorage.setItem('lastGame', activeGame);
        socket.emit('getStats');
        const handleStats = (data) => {
            if (data[activeGame]) setStats(data[activeGame]);
            else setStats({ online: 0, rooms: 0 });
        };
        socket.on('statsUpdate', handleStats);

        socket.on('matchFound', ({ roomId, gameType, mapSize, color }) => {
            setIsSearching(false);
            const path = `/${gameType === 'tic-tac-toe' ? 'caro' : gameType}/game`; // Mapping logic
            navigate(path, { state: { roomId, mode: 'multiplayer', mapSize, playerColor: color } });
        });

        socket.on('waitingForMatch', () => {
            setIsSearching(true);
        });

        return () => {
            socket.off('statsUpdate', handleStats);
            socket.off('matchFound');
            socket.off('waitingForMatch');
        };
    }, [activeGame]);

    const handleFindMatch = (specificGame = null) => {
        const targetGame = specificGame || (searchMode === 'active' ? activeGame : 'random');
        socket.emit('findMatch', { gameType: targetGame });
    };

    const handleJoinByCode = () => {
        if (!roomCode || roomCode.length < 4) return alert('Vui lòng nhập mã phòng hợp lệ!');
        
        socket.emit('lookupRoom', { roomId: roomCode }, (res) => {
            if (res.success) {
                const path = `/${res.gameType}/game`;
                navigate(path, { state: { roomId: roomCode, mode: 'multiplayer', gridSize: res.gridSize, difficulty: res.difficulty } });
            } else {
                alert(res.message || 'Không tìm thấy phòng!');
            }
        });
    };

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

                    <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
                            <Swords size={24} color="var(--accent-color)" />
                            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Matchmaking Hub</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                            {/* Cột 1: Tìm ngẫu nhiên */}
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Ghép cặp trực tuyến</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <button 
                                        className={searchMode === 'active' ? 'btn-primary' : 'btn-secondary'} 
                                        onClick={() => setSearchMode('active')}
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                                    >
                                        Game hiện tại
                                    </button>
                                    <button 
                                        className={searchMode === 'random' ? 'btn-primary' : 'btn-secondary'} 
                                        onClick={() => setSearchMode('random')}
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                                    >
                                        🎲 Random Game
                                    </button>
                                </div>
                                <button 
                                    className="btn-primary" 
                                    style={{ width: '100%', padding: '12px', background: isSearching ? '#ef4444' : 'var(--accent-color)' }}
                                    onClick={() => isSearching ? (socket.emit('leaveMatchmaking'), setIsSearching(false)) : handleFindMatch()}
                                >
                                    {isSearching ? '⏳ Đang tìm... (Hủy)' : `Tìm đối thủ ${searchMode === 'active' ? game.name : ''}`}
                                </button>
                            </div>

                            {/* Cột 2: Vào bằng mã */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Tham gia bằng mã</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="MÃ PHÒNG..." 
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        style={{ 
                                            flex: 1, padding: '10px', borderRadius: '8px', 
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white', fontWeight: 'bold', textAlign: 'center'
                                        }}
                                    />
                                    <button className="btn-secondary" style={{ padding: '0 15px' }} onClick={handleJoinByCode}>
                                        Vào
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    Hệ thống sẽ tự nhận diện loại game từ mã bạn nhập.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
