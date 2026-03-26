import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Users, Play, Hash } from 'lucide-react';
import { socket } from '../../utils/socket';

const sizes = [
    { label: '20x20', value: 20 },
    { label: '30x30', value: 30 }
];

export default function SnakeLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const initialMapSize = location.state?.mapSize || 20;

    const [mapSize, setMapSize] = useState(initialMapSize);
    const [joinRoomId, setJoinRoomId] = useState('');
    
    // States: 'idle', 'finding_match', 'hosting', 'guest'
    const [lobbyState, setLobbyState] = useState('idle');
    const [myRoom, setMyRoom] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    useEffect(() => {
        // MATCH FINDING LOGIC
        const handleMatchFound = (data) => {
            setMyRoom(data.roomId);
            setStatus('Đã tìm thấy đối thủ! Trận đấu sẽ bắt đầu ngay...');
            setTimeout(() => {
                navigate('/snake/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: data.roomId,
                        mapSize: data.mapSize || mapSize,
                        playerColor: data.color 
                    } 
                });
            }, 1000);
        };

        const handleWaiting = () => {
            setStatus(`Đang tìm đối thủ cho bản đồ ${mapSize}x${mapSize}...`);
        };

        // PRIVATE ROOM LOGIC
        const handlePlayerJoined = ({ players }) => {
            if (players === 2 && lobbyState === 'hosting') {
                setStatus('Bạn bè đã vào phòng! Đang khởi động...');
                socket.emit('startSnakeGame', { roomId: myRoom, mapSize });
            }
        };

        const handleGameStarted = (data) => {
            setStatus('Trận đấu bắt đầu...');
            setTimeout(() => {
                navigate('/snake/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: data.roomId,
                        mapSize: data.mapSize,
                        playerColor: data.color 
                    } 
                });
            }, 500);
        };

        socket.on('matchFound', handleMatchFound);
        socket.on('waitingForMatch', handleWaiting);
        socket.on('playerJoined', handlePlayerJoined);
        socket.on('snakeGameStarted', handleGameStarted);

        return () => {
            socket.off('matchFound', handleMatchFound);
            socket.off('waitingForMatch', handleWaiting);
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('snakeGameStarted', handleGameStarted);
            // Ignore cancel matching on unmount if game is starting
        };
    }, [navigate, mapSize, lobbyState, myRoom]);

    const handleFindMatch = () => {
        setLobbyState('finding_match');
        socket.emit('findMatch', { game: 'snake', mapSize });
    };

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'snake', gridSize: mapSize }, (res) => {
            setMyRoom(res.roomId);
            setLobbyState('hosting');
            setStatus('Đang chờ bạn bè kết nối...');
        });
    };

    const handleJoinRoom = () => {
        if (!joinRoomId) return;
        socket.emit('joinRoom', { roomId: joinRoomId.toUpperCase(), gameType: 'snake' }, (res) => {
            if (res.success) {
                setMyRoom(joinRoomId.toUpperCase());
                setLobbyState('guest');
                setStatus('Đã vào phòng! Chờ chủ phòng bắt đầu...');
                if (res.gridSize) setMapSize(res.gridSize);
            } else {
                setError(res.message);
                setTimeout(() => setError(''), 3000);
            }
        });
    };

    const handleCancel = () => {
        if (lobbyState === 'finding_match') socket.emit('leaveMatchmaking');
        setLobbyState('idle');
        setMyRoom('');
    };

    if (lobbyState !== 'idle') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '2rem', textAlign: 'center' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={24} /> {lobbyState === 'finding_match' ? 'Tìm trận' : 'Phòng Riêng'}
                        </h2>
                        <button className="btn-secondary" onClick={handleCancel} style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ArrowLeft size={16} /> Thoát
                        </button>
                    </div>

                    <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        {lobbyState === 'hosting' && (
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng (Map {mapSize}x{mapSize}):</p>
                                <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.5rem 0', fontSize: '3rem' }}>{myRoom}</h1>
                                <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Gửi mã này cho bạn bè...</p>
                            </div>
                        )}

                        <Loader2 size={48} className="spin-animation" style={{ color: 'var(--primary-color, #4facfe)' }} />
                        <h3 style={{ margin: 0 }}>{status}</h3>
                        {lobbyState === 'finding_match' && <p style={{ color: 'var(--text-secondary)' }}>Hệ thống đang dò tìm cao thủ...</p>}
                    </div>

                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        .spin-animation { animation: spin 2s linear infinite; }
                    `}} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 1rem' }}>
            <div className="glass-panel menu-container" style={{ maxWidth: '450px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Sảnh Chờ Multiplayer</h2>
                    <button className="btn-secondary" onClick={() => navigate('/snake')} style={{ padding: '8px', border: 'none' }}>
                        <ArrowLeft size={20} />
                    </button>
                </div>
                
                {!isConnected && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--error-color)' }}>
                        ⚠️ Máy chủ đang mất kết nối. Vui lòng chờ...
                    </div>
                )}

                {/* RANDOM MATCHMAKING */}
                <div style={{ background: 'rgba(79, 172, 254, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(79, 172, 254, 0.3)' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#4facfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Play size={20} /> Tìm Trận Nhanh (Auto Match)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Ghép cặp ngẫu nhiên với người chơi khác trên toàn thế giới.</p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                        {sizes.map((s) => (
                            <button 
                                key={s.label}
                                className={mapSize === s.value ? 'btn-primary' : 'btn-secondary'}
                                onClick={() => setMapSize(s.value)}
                                style={{ flex: 1, padding: '10px' }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }} onClick={handleFindMatch}>
                        Bắt Đầu Tìm Xếp Hạng
                    </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>

                {/* PRIVATE ROOMS */}
                <div style={{ textAlign: 'left', width: '100%' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} /> Tạo phòng riêng
                    </h3>
                    <button className="btn-secondary" style={{ width: '100%', padding: '12px', marginBottom: '1rem', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }} onClick={handleCreateRoom}>
                        + Tạo Mã Phòng Mới
                    </button>
                    
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Hash size={20} /> Tham gia phòng
                    </h3>
                    <input
                        type="text"
                        placeholder="NHẬP MÃ PHÒNG VÀO ĐÂY"
                        value={joinRoomId}
                        onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                        className="glass-input"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px', fontSize: '1.2rem' }}
                    />
                    {error && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}
                    <button className="btn-primary" style={{ width: '100%', padding: '12px' }} onClick={handleJoinRoom}>
                        Vào Phòng
                    </button>
                </div>
            </div>
        </div>
    );
}
