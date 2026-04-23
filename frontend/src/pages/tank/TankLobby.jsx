import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { EVENTS } from '../../utils/constants';
import { ShieldAlert, Loader2, ArrowLeft, Swords } from 'lucide-react';

export default function TankLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [difficulty, setDifficulty] = useState(location.state?.difficulty || 'medium');
    
    // States: 'idle', 'finding_match', 'hosting', 'guest'
    const [lobbyState, setLobbyState] = useState('idle');
    const [myRoom, setMyRoom] = useState('');
    const [status, setStatus] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty, gameType: 'tank' }, (res) => {
            setMyRoom(res.roomId);
            setLobbyState('hosting');
            setStatus('Đang chờ bạn bè kết nối...');
        });
    }, [difficulty]);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Auto create if requested
        if (location.state?.autoCreate && lobbyState === 'idle' && !myRoom) {
            if (socket.connected) {
                handleCreateRoom();
            }
        }

        // Handle joining from Home.jsx
        if (location.state?.joinedRoom && lobbyState === 'idle') {
            const rid = location.state.joinedRoom;
            socket.emit('joinRoom', { roomId: rid }, (res) => {
                if (res.success) {
                    setMyRoom(rid);
                    setLobbyState('guest');
                    setStatus('Đã tham gia phòng! Đang chờ chủ phòng bắt đầu...');
                } else {
                    alert(res.message || 'Không thể tham gia phòng');
                    navigate('/tank');
                }
            });
        }

        // Handle matched from Matchmaking
        if (location.state?.matchedRoom && lobbyState === 'idle') {
            setMyRoom(location.state.matchedRoom);
            setLobbyState('guest');
            setStatus('Đã tìm thấy đối thủ! Trận đấu sắp bắt đầu...');
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, lobbyState, myRoom, handleCreateRoom, navigate]);

    useEffect(() => {
        const handlePlayerJoined = ({ players }) => {
            if (players === 2 && lobbyState === 'hosting') {
                setStatus('Đối thủ đã vào phòng! Đang khởi động...');
                socket.emit(EVENTS.START_TANK_GAME, { roomId: myRoom, level: 1 });
            }
        };

        const handleGameStarted = (data) => {
            setStatus('Trận đấu bắt đầu...');
            setTimeout(() => {
                navigate('/tank/game', { 
                    state: { 
                        mode: 'multiplayer', 
                        roomId: myRoom, 
                        difficulty,
                        level: data.level || 1
                    } 
                });
            }, 500);
        };

        const handleMatchFound = (data) => {
            setMyRoom(data.roomId);
            setLobbyState('guest');
            setStatus('Đã tìm thấy đối thủ! Trận đấu sẽ bắt đầu ngay...');
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on(EVENTS.TANK_GAME_STARTED, handleGameStarted);
        socket.on('matchFound', handleMatchFound);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off(EVENTS.TANK_GAME_STARTED, handleGameStarted);
            socket.off('matchFound', handleMatchFound);
        };
    }, [navigate, myRoom, lobbyState, difficulty]);

    const handleCancel = () => {
        if (lobbyState === 'finding_match') socket.emit('leaveMatchmaking');
        if (lobbyState === 'hosting' && myRoom) socket.emit('leaveRoom', { roomId: myRoom });
        setLobbyState('idle');
        setMyRoom('');
        navigate('/tank');
    };

    if (lobbyState !== 'idle') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(100,116,139,0.08) 0%, transparent 70%)' }}>
                <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Swords size={28} color="#64748b" />
                        <h2 style={{ margin: 0, color: '#64748b' }}>Tank Online</h2>
                    </div>

                    {lobbyState === 'hosting' && (
                        <div style={{ background: 'rgba(100,116,139,0.06)', border: '1.5px solid rgba(100,116,139,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px 0' }}>Mã phòng (Private Room)</p>
                            <h1 style={{ letterSpacing: '4px', color: '#64748b', margin: 0, fontSize: '2.5rem', fontFamily: 'monospace', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                            <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', marginTop: '15px' }}>Đang chờ đối thủ...</p>
                        </div>
                    )}

                    {(lobbyState === 'guest' || lobbyState === 'finding_match') && (
                        <div style={{ background: 'rgba(100,116,139,0.06)', border: '1.5px solid rgba(100,116,139,0.25)', borderRadius: '16px', padding: '30px 20px', marginBottom: '1.5rem' }}>
                            <Loader2 size={48} className="spin-animation" style={{ color: '#64748b', margin: '0 auto 15px' }} />
                            <h3 style={{ margin: 0, color: '#64748b' }}>{status}</h3>
                        </div>
                    )}

                    <button className="btn-secondary" style={{ width: '100%', padding: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={handleCancel}>
                        <ArrowLeft size={18} /> Hủy tìm / Rời phòng
                    </button>
                    
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                        .spin-animation { animation: spin 2s linear infinite; }
                    `}} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '1rem' }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 1.5rem 0' }}>Đang khởi tạo...</h2>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(100,116,139,0.2)', borderTopColor: '#64748b', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                {!isConnected && <p style={{ color: '#ef4444', marginTop: '1rem' }}>⚠️ Đang kết nối server...</p>}
                <button className="btn-secondary" style={{ marginTop: '2rem', width: '100%', padding: '12px' }} onClick={() => navigate('/tank')}>Hủy</button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
