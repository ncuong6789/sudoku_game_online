import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Grid3X3, Swords, Trophy, Users, X, Activity, Ghost, Crown, Zap, Layers, Hash, Menu, User as UserIcon, LogOut, Info, Heart, Puzzle } from 'lucide-react';
import { socket } from '../utils/socket';
import AuthModal from '../components/AuthModal';
import DonateModal from '../components/DonateModal';
import { useAuth } from '../context/AuthContext';

const games = {
    sudoku: {
        id: 'sudoku',
        name: 'Sudoku',
        description: 'Một bài toán logic tưởng chừng đơn giản nhưng đầy thử thách. Mỗi con số bạn đặt xuống đều ảnh hưởng đến toàn bộ bàn cờ. Quan sát, suy luận và từng bước giải mã để hoàn thành bảng Sudoku hoàn hảo.',
        path: '/sudoku',
        difficulty: 'Vừa',
        instructions: [
            'Điền các số từ 1 đến 9 vào các ô trống.',
            'Không được lặp lại số trong cùng một hàng, cột hoặc vùng 3x3.',
            'Phân tích các ô đã có để suy ra vị trí hợp lệ.',
            'Tránh đoán mò – hãy dựa vào logic để giải bài.',
            'Kiên nhẫn và tập trung là chìa khóa để hoàn thành.',
            'Hoàn thành toàn bộ bảng mà không sai sót để chiến thắng.'
        ]
    },
    caro: {
        id: 'caro',
        name: 'Tic-Tac-Toe',
        description: 'Trò chơi đấu trí kinh điển với nhiều kích thước bàn cờ: từ 3x3 nhanh gọn đến 15x15 và 20x20 đầy chiến thuật. Người chơi thay phiên đặt quân để tạo thành chuỗi chiến thắng, từ những ván đấu nhanh cho đến những màn so tài căng não.',
        path: '/caro',
        difficulty: 'Cao',
        instructions: [
            'Chọn chế độ phù hợp: 3x3 (casual), 15x15 hoặc 20x20 (chiến thuật).',
            'Thay phiên đặt quân X và O lên bàn cờ.',
            'Tạo chuỗi 5 quân liên tiếp để chiến thắng (3 quân với chế độ 3x3).',
            'Kết hợp tấn công và phòng thủ để kiểm soát thế trận.',
            'Dự đoán nước đi của đối thủ để tránh rơi vào bẫy.',
            'Một sai lầm nhỏ có thể khiến bạn thua ngay lập tức.'
        ]
    },
    chess: {
        id: 'chess',
        name: 'Chess',
        description: 'Trò chơi chiến thuật kinh điển trên bàn cờ 8x8, nơi mỗi nước đi đều mang tính quyết định. Điều khiển các quân cờ với quy tắc riêng biệt, xây dựng chiến lược và tìm cách chiếu bí vua đối phương để giành chiến thắng.',
        path: '/chess',
        difficulty: 'Rất cao',
        instructions: [
            'Cờ vua là trò chơi chiến thuật dành cho hai người chơi trên bàn cờ 8x8.',
            'Mỗi loại quân cờ có cách di chuyển riêng (Tốt, Mã, Tượng, Xe, Hậu, Vua).',
            'Mục tiêu là đặt Vua đối phương vào trạng thái "chiếu bí" (không thể thoát).',
            'Bảo vệ Vua của bạn và tận dụng các quân cờ để kiểm soát thế trận.',
            'Lên kế hoạch trước nhiều nước đi để chiếm ưu thế và kết thúc ván đấu.'
        ]
    },
    snake: {
        id: 'snake',
        name: 'Snake',
        description: 'Điều khiển chú rắn sinh tồn trên bản đồ lưới, thu thập thức ăn để lớn dần và tăng tốc độ. Càng dài, thử thách càng cao khi không gian di chuyển bị thu hẹp. Tham gia chế độ Multiplayer để cạnh tranh và loại bỏ đối thủ trong những pha đấu trí căng thẳng!',
        path: '/snake',
        difficulty: 'Tuỳ chỉnh',
        instructions: [
            'Sử dụng các phím mũi tên (Lên, Xuống, Trái, Phải) để điều khiển hướng di chuyển của rắn.',
            'Ăn mồi để tăng chiều dài và tốc độ của rắn.',
            'Tránh va chạm với tường và chính cơ thể của bạn.',
            'Trong chế độ Multiplayer, va chạm với đối thủ sẽ khiến bạn bị loại.',
            'Rắn bị loại sẽ trở thành chướng ngại vật trên bản đồ.',
            'Càng sống lâu và ăn nhiều, điểm số của bạn càng cao.'
        ]
    },
    tetris: {
        name: 'Tetris',
        description: 'Những khối gạch không ngừng rơi xuống – bạn có đủ nhanh và chính xác để kiểm soát chúng? Xoay, sắp xếp và tạo combo xóa hàng để ghi điểm tối đa. Tham gia chế độ Multiplayer và chứng minh ai mới là bậc thầy Tetris thực thụ!',
        path: '/tetris',
        difficulty: 'Vừa',
        instructions: [
            'Dùng phím TRÁI/PHẢI để điều khiển vị trí khối gạch.',
            'Nhấn XUỐNG để tăng tốc độ rơi và kiểm soát nhịp độ.',
            'Nhấn LÊN để xoay khối gạch theo ý muốn.',
            'Nhấn Space để thực hiện Hard Drop – thả nhanh xuống vị trí cuối.',
            'Xóa nhiều hàng cùng lúc để ghi điểm cao hơn.',
            'Nếu khối gạch chạm đỉnh màn hình, trò chơi sẽ kết thúc.'
        ]
    },
    pacman: {
        id: 'pacman',
        name: 'Pacman',
        description: 'Khám phá mê cung đầy thử thách, nơi mỗi bước đi đều có thể là sống hoặc bị bắt. Thu thập chấm, né tránh bầy ma và tận dụng Power Pill để đảo ngược tình thế, biến kẻ săn thành con mồi!',
        path: '/pacman',
        difficulty: 'Tuỳ chỉnh',
        instructions: [
            'Sử dụng các phím mũi tên để điều khiển Pacman di chuyển trong mê cung.',
            'Thu thập toàn bộ chấm nhỏ (dots) để hoàn thành màn chơi.',
            'Ăn Power Pill để tạm thời trở nên mạnh mẽ và có thể tiêu diệt các con ma.',
            'Tận dụng các lối đi và cổng dịch chuyển để né tránh hoặc đánh lừa kẻ địch.',
            'Tránh va chạm với ma khi không có sức mạnh, nếu không bạn sẽ thua cuộc.'
        ]
    },
    pikachu: {
        id: 'pikachu',
        name: 'Pikachu Onet',
        description: 'Huyền thoại game nối thú kinh điển! Tìm và nối 2 hình giống nhau với tối đa 2 lần rẽ để làm chúng biến mất. Chinh phục các chướng ngại vật thay đổi liên tục qua từng vòng chơi với độ khó tăng dần!',
        path: '/pikachu',
        difficulty: 'Dễ - Khó',
        instructions: [
            'Nhấp vào 2 hình giống nhau để nối và ghi điểm.',
            'Đường nối giữa 2 hình không được có vật cản và tối đa 2 lần rẽ vuông góc (tạo thành hình chữ U, Z hoặc L).',
            'Sử dụng nút Gợi ý (tốn một ít thời gian) hoặc chức năng Đảo hình (Shuffle) khi bế tắc.',
            'Ở mỗi vòng, sau khi nối ô thì bản đồ có thể rớt khối, dồn sang trái phải để tăng độ khó.',
            'Dọn dẹp toàn bộ bản đồ trước khi hết giờ để sang vòng tiếp theo.'
        ]
    },
    tank: {
        id: 'tank',
        name: 'Tanks',
        description: 'Cuộc chiến xe tăng nảy lửa! Điều khiển xe tăng của bạn, né tránh đạn và tiêu diệt đối thủ trong chiến trường cổ điển. Sử dụng địa hình để ẩn nấp và phản công bất ngờ!',
        path: '/tank',
        difficulty: 'Vừa - Cao',
        instructions: [
            'Sử dụng các phím WASD hoặc Mũi tên để di chuyển xe tăng.',
            'Nhấn SPACE để bắn đạn vào đối phương.',
            'Lợi dụng các chướng ngại vật để che chắn khỏi làn đạn.',
            'Mỗi xe tăng có một lượng máu nhất định, hãy bảo toàn máu của bạn.',
            'Tiêu diệt đối thủ để giành chiến thắng trong trận đấu.'
        ]
    },
    jungle: {
        id: 'jungle',
        name: 'Cờ Thú',
        description: 'Trò chơi chiến thuật cổ điển với 8 loài mãnh thú. Hãy sử dụng tư duy để đưa quân vào hang đối phương và giành chiến thắng trên bàn cờ rực rỡ.',
        path: '/jungle',
        difficulty: 'Dễ - Khó',
        instructions: [
            'Mỗi bên có 8 quân thú với cấp bậc từ 1 (Chuột) đến 8 (Voi).',
            'Cấp cao hơn ăn được cấp thấp hơn, ngoại trừ Chuột ăn được Voi.',
            'Hổ và Sư tử có thể nhảy qua sông nếu không có quân nào chắn đường.',
            'Chuột là quân duy nhất có thể đi vào ô sông (nướ́c).',
            'Chiến thắng bằng cách đưa bất kỳ quân nào vào Hang (Den) của đối phương.'
        ]
    }
};

export default function Home() {
    const navigate = useNavigate();
    const auth = useAuth();
    const { user, logout } = auth || {};
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showDonateModal, setShowDonateModal] = useState(false);
    // Persistence: Get last active game from localStorage
    const [activeGame, setActiveGame] = useState(() => localStorage.getItem('lastGame') || 'sudoku');
    const [showHelp, setShowHelp] = useState(false);
    const [stats, setStats] = useState({ online: 0, rooms: 0 });
    const [matchmakingReady, setMatchmakingReady] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [searchMode, setSearchMode] = useState('active'); // 'active' (selected game) or 'random' (random game)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const game = games[activeGame];
    const isUnplayableOnMobile = isMobile && ['snake', 'tetris', 'pacman', 'pikachu', 'tank', 'jungle'].includes(activeGame);

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
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <DonateModal isOpen={showDonateModal} onClose={() => setShowDonateModal(false)} />
            <div className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ justifyContent: 'space-between' }}>

                {/* ── TOP: Logo + Menu ── */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
                    <div className="sidebar-logo" style={{ marginBottom: '1rem' }}>GameOnl</div>

                    {/* Game list — cuộn nếu cần, không làm sidebar phình */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', flex: 1 }}>
                        {[
                            { id: 'sudoku', label: 'Sudoku', Icon: Grid3X3 },
                            { id: 'caro', label: 'Tic-Tac-Toe', Icon: Swords },
                            { id: 'chess', label: 'Chess', Icon: Crown },
                            { id: 'snake', label: 'Snake', Icon: Zap },
                            { id: 'tetris', label: 'Tetris', Icon: Layers },
                            { id: 'pacman', label: 'Pacman', Icon: Ghost },
                            { id: 'pikachu', label: 'Pikachu', Icon: Puzzle },
                            { id: 'tank', label: 'Tanks', Icon: Target },
                            { id: 'jungle', label: 'Cờ Thú', Icon: TreePine },
                        ].map(({ id, label, Icon }) => (
                            <div key={id}
                                className={`nav-item ${activeGame === id ? 'active' : ''}`}
                                onClick={() => { setActiveGame(id); setShowHelp(false); if (isMobile) setIsSidebarOpen(false); }}>
                                <Icon size={20} /> {label}
                            </div>
                        ))}

                        {/* Social — chỉ hiện khi đã đăng nhập */}
                        {user && (
                            <>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
                                <div className="nav-item"><Trophy size={20} /> Xếp hạng</div>
                                <div className="nav-item"><Users size={20} /> Bạn bè</div>
                            </>
                        )}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
                        <div className="nav-item" onClick={() => setShowDonateModal(true)} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                            <Heart size={20} fill="#ef4444" /> Ủng hộ dự án
                        </div>
                    </nav>
                </div>

                {/* ── BOTTOM: User Info / Đăng nhập ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', flexShrink: 0, marginTop: '8px' }}>
                    {user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)', borderRadius: '50%', padding: '7px', flexShrink: 0 }}>
                                    <UserIcon size={16} color="#fff" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>⭐ {user.score ?? 0} điểm</span>
                                </div>
                            </div>
                            <button onClick={logout} className="btn-secondary" style={{ padding: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                <LogOut size={14} /> Đăng xuất
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Đăng nhập để xem xếp hạng</p>
                            <button className="btn-primary" onClick={() => setShowAuthModal(true)} style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                                <UserIcon size={15} /> Đăng Nhập
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <main className="main-content" style={{
                padding: '3rem',
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
            }}>
                {isMobile && (
                    <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                        <Menu size={28} />
                    </button>
                )}

                <div className="game-detail" style={{ maxWidth: '800px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '15px' }}>
                        <div className="game-icon-container" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                            {activeGame === 'sudoku' && <Grid3X3 size={32} color="var(--accent-color)" />}
                            {activeGame === 'caro' && <Swords size={32} color="var(--accent-color)" />}
                            {activeGame === 'chess' && <Crown size={32} color="var(--accent-color)" />}
                            {activeGame === 'snake' && <Zap size={32} color="var(--accent-color)" />}
                            {activeGame === 'tetris' && <Layers size={32} color="var(--accent-color)" />}
                            {activeGame === 'pacman' && <Ghost size={32} color="var(--accent-color)" />}
                            {activeGame === 'pikachu' && <Puzzle size={32} color="var(--accent-color)" />}
                            {activeGame === 'tank' && <Target size={32} color="var(--accent-color)" />}
                            {activeGame === 'jungle' && <TreePine size={32} color="var(--accent-color)" />}
                        </div>
                        <h1 className="game-title" style={{ margin: 0, fontSize: '3rem' }}>{game.name}</h1>
                    </div>

                    <p className="game-desc" style={{ 
                        marginBottom: '1.5rem', 
                        fontSize: '1.1rem',
                        textAlign: 'left'
                    }}>
                        {game.description}
                    </p>

                    <div className="action-row" style={{ marginBottom: '2rem', display: 'flex', gap: '0.8rem' }}>
                        <button
                            className={!showHelp ? "btn-primary" : "btn-secondary"}
                            onClick={() => showHelp ? setShowHelp(false) : navigate(game.path)}
                            style={{
                                flex: 1,
                                padding: '14px',
                                opacity: isUnplayableOnMobile ? 0.5 : 1,
                                cursor: isUnplayableOnMobile ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isUnplayableOnMobile}
                        >
                            {isUnplayableOnMobile ? 'Sắp có trên Mobile' : 'Bắt đầu chơi'}
                        </button>
                        <button
                            className={showHelp ? "btn-primary" : "btn-secondary"}
                            onClick={() => setShowHelp(!showHelp)}
                            style={{
                                flex: 1,
                                padding: '14px'
                            }}
                        >
                            <Info size={20} style={{ marginRight: '8px' }} /> Hướng dẫn
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

                    {activeGame !== 'pacman' && activeGame !== 'pikachu' && (
                        <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
                                <Swords size={24} color="var(--accent-color)" />
                                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Matchmaking Hub</h3>
                            </div>

                            <div className="matchmaking-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                                {/* Cột 1: Tìm ngẫu nhiên */}
                                <div className="matchmaking-col-1" style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1.5rem' }}>
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
                                        style={{ width: '100%', padding: '12px', background: isSearching ? '#ef4444' : 'var(--accent-color)', opacity: isUnplayableOnMobile && searchMode === 'active' ? 0.5 : 1 }}
                                        onClick={() => {
                                            if (isUnplayableOnMobile && searchMode === 'active') return alert('Game này chưa tối ưu trên điện thoại!');
                                            isSearching ? (socket.emit('leaveMatchmaking'), setIsSearching(false)) : handleFindMatch();
                                        }}
                                        disabled={isUnplayableOnMobile && searchMode === 'active'}
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
                    )}
                </div>
            </main>
        </div>
    );
}
