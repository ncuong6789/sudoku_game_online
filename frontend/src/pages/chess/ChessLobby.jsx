import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { User } from 'lucide-react';

export default function ChessLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    
    // Negotiation state
    const [myColor, setMyColor] = useState('random'); // w, b, random
    const [opponentColor, setOpponentColor] = useState('random');
    const [isOpponentReady, setIsOpponentReady] = useState(false);
    const [isMyReady, setIsMyReady] = useState(false);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'chess' }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
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

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [location.state, inRoom, myRoom, handleCreateRoom]);

    // Setup Room socket listeners
    useEffect(() => {
        if (!myRoom) return;

        const handlePlayerJoined = ({ players }) => {
            if (players === 2) {
                // New opponent joined, reset ready states
                setIsOpponentReady(false);
                setOpponentColor('random');
                // Auto send our current preference
                socket.emit('chessColorSelect', { roomId: myRoom, color: myColor, ready: isMyReady });
            }
        };

        const handleColorUpdate = (data) => {
            setOpponentColor(data.color);
            setIsOpponentReady(data.ready);
        };

        const handleGameStarted = (data) => {
            navigate('/chess/game', { state: { mode: 'multiplayer', roomId: myRoom, playerColor: data.playerColors[socket.id] } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('chessColorUpdate', handleColorUpdate);
        socket.on('chessGameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('chessColorUpdate', handleColorUpdate);
            socket.off('chessGameStarted', handleGameStarted);
        };
    }, [myRoom, myColor, isMyReady, navigate]);

    // Update our preference to others
    const updateMyColor = (c) => {
        setMyColor(c);
        setIsMyReady(false); // unready when changing color
        socket.emit('chessColorSelect', { roomId: myRoom, color: c, ready: false });
    };

    const toggleReady = () => {
        const newReady = !isMyReady;
        setIsMyReady(newReady);
        socket.emit('chessColorSelect', { roomId: myRoom, color: myColor, ready: newReady });
        
        // If both are ready, the server will trigger the game start. 
        if (newReady && isOpponentReady) {
            socket.emit('startChessGame', { roomId: myRoom });
        }
    };


    const hasConflict = myColor !== 'random' && opponentColor !== 'random' && myColor === opponentColor;
    const canReady = !hasConflict;

    if (inRoom) {
        return (
            <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', margin: '0 0 1rem 0' }}>Trạng thái Bàn cờ</h2>

                <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng:</p>
                    <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.3rem 0', userSelect: 'text', cursor: 'text' }}>{myRoom}</h1>
                </div>

                {/* Opponent Selection */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '12px', marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}><User size={16}/> Đối thủ</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: isOpponentReady ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}>
                            {isOpponentReady ? 'SẴN SÀNG' : 'CHỜ...'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['w', 'b', 'random'].map(c => (
                            <div key={c} style={{ flex: 1, padding: '6px', textAlign: 'center', borderRadius: '8px', fontSize: '0.8rem',
                                background: opponentColor === c ? 'rgba(79, 172, 254, 0.3)' : 'rgba(255,255,255,0.05)',
                                border: opponentColor === c ? '1px solid var(--primary-color)' : '1px solid transparent',
                                opacity: 0.8
                            }}>
                                {c === 'w' ? 'Trắng' : c === 'b' ? 'Đen' : 'Random'}
                            </div>
                        ))}
                    </div>
                </div>

                {/* VS divider */}
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 'bold', margin: '0.5rem 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ background: 'var(--bg-color)', padding: '0 10px', position: 'relative', fontSize: '0.9rem' }}>V S</span>
                </div>

                {/* My Selection */}
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1rem', border: hasConflict ? '1px solid var(--error-color)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span>👉 Bạn chọn phe:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['w', 'b', 'random'].map(c => (
                            <button key={c} onClick={() => updateMyColor(c)} style={{ flex: 1, padding: '6px', textAlign: 'center', borderRadius: '8px', fontSize: '0.8rem',
                                background: myColor === c ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                                border: 'none', color: 'white', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: myColor === c ? '0 0 10px rgba(79, 172, 254, 0.5)' : 'none'
                            }}>
                                {c === 'w' ? 'Trắng' : c === 'b' ? 'Đen' : 'Random'}
                            </button>
                        ))}
                    </div>
                    {hasConflict && <p style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '10px', textAlign: 'center', marginBottom: 0 }}>Cả 2 không thể chọn cùng màu!</p>}
                </div>

                {/* Ready Button */}
                <button 
                    className={isMyReady ? "btn-secondary" : "btn-primary"} 
                    style={{ width: '100%', padding: '14px', background: isMyReady ? 'var(--success-color)' : undefined, borderColor: isMyReady ? 'transparent' : undefined }}
                    disabled={!canReady}
                    onClick={toggleReady}
                >
                    {isMyReady ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG'}
                </button>
                <button className="btn-secondary" style={{ width: 'auto', marginTop: '10px', opacity: 0.7 }} onClick={() => {
                    setInRoom(false); setMyRoom(''); navigate('/chess');
                }}>Rời phòng</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Đang tạo phòng...</h2>
            <div className="loader" style={{ margin: '20px auto' }}></div>
            {!isConnected && <p style={{ color: 'var(--error-color)' }}>⚠️ Mất kết nối server...</p>}
            <button className="btn-secondary" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => navigate('/chess')}>Hủy</button>
        </div>
    );
}
