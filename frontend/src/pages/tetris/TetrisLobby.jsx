import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';

export default function TetrisLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [playerCount, setPlayerCount] = useState(1);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() { setIsConnected(true); }
        function onDisconnect() { setIsConnected(false); }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            setPlayerCount(players);
            if (players === 2) {
                // Host initiates game start
                socket.emit('startTetrisGame', { roomId: myRoom });
            }
        };

        const handleGameStarted = ({ pieceSequence }) => {
            navigate('/tetris/game', { state: { mode: 'multiplayer', roomId: myRoom, difficulty, pieceSequence } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('tetrisGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('tetrisGameStarted', handleGameStarted);
        };
    }, [difficulty, navigate, myRoom]);

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty, gameType: 'tetris' }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
            setPlayerCount(1);
        });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        setError('');
        socket.emit('joinRoom', { roomId: roomId.toUpperCase(), gameType: 'tetris' }, (res) => {
            if (res.success) {
                setMyRoom(roomId.toUpperCase());
                setDifficulty(res.difficulty);
                setInRoom(true);
                setPlayerCount(2);
            } else {
                setError(res.message);
            }
        });
    };

    if (inRoom) {
        return (
            <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
                <h2>Phòng: {myRoom}</h2>
                <p>Tốc độ: {difficulty}</p>
                <p>Người chơi: {playerCount}/2</p>
                {playerCount < 2 ? (
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Đang chờ đối thủ...</p>
                ) : (
                    <p style={{ color: 'var(--success-color)', fontWeight: 600 }}>Bắt đầu trận đấu!</p>
                )}
                <button className="btn-secondary" style={{ marginTop: '20px', width: 'auto' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    navigate('/tetris');
                }}>Rời phòng</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2 style={{ whiteSpace: 'nowrap', userSelect: 'none' }}>Sảnh Tetris Multiplayer</h2>
            
            {!isConnected && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--error-color)', fontSize: '0.9rem' }}>
                    ⚠️ Mất kết nối. Đang kết nối lại với Server...
                </div>
            )}
            
            <div style={{ marginBottom: '10px', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Tạo phòng mới</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {['Easy', 'Medium', 'Hard'].map((d) => (
                        <button 
                            key={d}
                            className={difficulty === d ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => setDifficulty(d)}
                            style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                        >
                            {d === 'Easy' ? 'Chậm' : d === 'Medium' ? 'Vừa' : 'Nhanh'}
                        </button>
                    ))}
                </div>
                <button className="btn-primary" style={{ padding: '10px', width: '100%' }} onClick={handleCreateRoom}>Tạo phòng</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
            <div style={{ textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Vào phòng đã có</h3>
                <input
                    type="text"
                    placeholder="NHẬP MÃ PHÒNG"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())}
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '8px', 
                        background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', 
                        textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px'
                    }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>{error}</p>}
                <button className="btn-primary" style={{ padding: '10px', width: '100%' }} onClick={handleJoinRoom}>Tham gia</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '1rem', padding: '10px', width: 'auto' }} onClick={() => navigate('/tetris')}>Quay lại Menu</button>
        </div>
    );
}
