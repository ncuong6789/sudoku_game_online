import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { Puzzle } from 'lucide-react';

export default function PikachuLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'pikachu' }, (res) => {
            if (res?.roomId) {
                setMyRoom(res.roomId);
                setInRoom(true);
            }
        });
    }, []);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Auto create if requested
        if (location.state?.autoCreate && !inRoom && !myRoom) {
            if (socket.connected) {
                handleCreateRoom();
            }
        }

        // Handle joining from Home.jsx
        if (location.state?.joinedRoom && !inRoom) {
            const rid = location.state.joinedRoom;
            socket.emit('joinRoom', { roomId: rid }, (res) => {
                if (res.success) {
                    setMyRoom(rid);
                    setInRoom(true);
                } else {
                    alert(res.message || 'Không thể tham gia phòng');
                    navigate('/pikachu');
                }
            });
        }

        // Handle matched from Matchmaking
        if (location.state?.matchedRoom && !inRoom) {
            setMyRoom(location.state.matchedRoom);
            setInRoom(true);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, inRoom, myRoom, handleCreateRoom, navigate]);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                navigate('/pikachu/online-game', { state: { roomId: myRoom, isHost: true } });
            }
        };

        socket.on('playerJoined', handlePlayerJoined);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
        };
    }, [myRoom, navigate]);

    if (inRoom) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.08) 0%, transparent 70%)' }}>
                <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Puzzle size={28} color="#eab308" />
                        <h2 style={{ margin: 0, color: '#eab308' }}>Pikachu Online</h2>
                    </div>
                    <div style={{ background: 'rgba(234,179,8,0.06)', border: '1.5px solid rgba(234,179,8,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px 0' }}>Mã phòng của bạn</p>
                        <h1 style={{ letterSpacing: '4px', color: '#eab308', margin: 0, fontSize: '2.5rem', fontFamily: 'monospace', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                        <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem', marginTop: '15px' }}>Đang chờ đối thủ...</p>
                    </div>
                    <button className="btn-secondary" style={{ width: '100%', padding: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }} onClick={() => {
                        setInRoom(false);
                        setMyRoom('');
                        socket.emit('leaveRoom', myRoom);
                        navigate('/pikachu');
                    }}>Hủy phòng</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 1.5rem 0' }}>Đang khởi tạo...</h2>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(234,179,8,0.2)', borderTopColor: '#eab308', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠️ Đang kết nối server...</p>}
                <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '12px' }} onClick={() => navigate('/pikachu')}>Hủy</button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
