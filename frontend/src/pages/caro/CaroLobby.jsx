import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { Grid3x3 } from 'lucide-react';
const sizes = [
    { label: '3x3', value: 3 },
    { label: '15x15', value: 15 },
    { label: '30x30', value: 30 }
];

export default function CaroLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [gridSize, setGridSize] = useState(location.state?.gridSize || 15);
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'caro', gridSize }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
        });
    }, [gridSize]);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Player 2 joined via room code — join the room on server, then show lobby UI
        if (location.state?.joinedRoom && !inRoom && !myRoom) {
            const code = location.state.joinedRoom;
            if (socket.connected) {
                socket.emit('joinRoom', { roomId: code, gameType: 'caro' }, (res) => {
                    if (res.success) {
                        setMyRoom(code);
                        setInRoom(true);
                    } else {
                        alert(res.message || 'Phòng đã đầy!');
                        navigate('/caro');
                    }
                });
            }
        }
        // From matchmaking — already joined by server, just show lobby UI
        else if (location.state?.matchedRoom && !inRoom && !myRoom) {
            setMyRoom(location.state.matchedRoom);
            setInRoom(true);
        }
        // Host auto-create
        else if (location.state?.autoCreate && !inRoom && !myRoom) {
            if (socket.connected) {
                handleCreateRoom();
            }
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, inRoom, myRoom, handleCreateRoom]);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                socket.emit('startCaroGame', { roomId: myRoom });
            }
        };

        const handleGameStarted = ({ gridSize: serverGridSize, playerSymbol }) => {
            navigate('/caro/game', { state: { mode: 'multiplayer', roomId: myRoom, gridSize: serverGridSize || gridSize, playerSymbol } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('caroGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('caroGameStarted', handleGameStarted);
        };
    }, [myRoom, navigate, gridSize]);

    if (inRoom) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)' }}>
                <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Grid3x3 size={28} color="#3b82f6" />
                        <h2 style={{ margin: 0, color: '#3b82f6' }}>Caro Online</h2>
                    </div>
                    <div style={{ background: 'rgba(59,130,246,0.06)', border: '1.5px solid rgba(59,130,246,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px 0' }}>Mã phòng (Size {gridSize}x{gridSize})</p>
                        <h1 style={{ letterSpacing: '4px', color: '#3b82f6', margin: 0, fontSize: '2.5rem', fontFamily: 'monospace', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                        <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem', marginTop: '15px' }}>Đang chờ đối thủ...</p>
                    </div>
                    <button className="btn-secondary" style={{ width: '100%', padding: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }} onClick={() => {
                        setInRoom(false);
                        setMyRoom('');
                        socket.emit('leaveRoom', myRoom);
                        navigate('/caro');
                    }}>Hủy phòng</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 1.5rem 0' }}>Đang khởi tạo...</h2>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠️ Đang kết nối server...</p>}
                <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '12px' }} onClick={() => navigate('/caro')}>Hủy</button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
