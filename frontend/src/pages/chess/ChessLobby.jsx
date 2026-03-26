import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { Send, User } from 'lucide-react';

export default function ChessLobby() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    
    // Negotiation state
    const [myColor, setMyColor] = useState('random'); // w, b, random
    const [opponentColor, setOpponentColor] = useState('random');
    const [isOpponentReady, setIsOpponentReady] = useState(false);
    const [isMyReady, setIsMyReady] = useState(false);
    
    // Chat state removed

    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

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
            socket.off('playerJoined');
            socket.off('chessColorUpdate');
            socket.off('chessGameStarted');
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
        // We also manually emit a check to start game if we know both are ready
        if (newReady && isOpponentReady) {
            socket.emit('startChessGame', { roomId: myRoom });
        }
    };

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty: 'Medium', gameType: 'chess' }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
        });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        socket.emit('joinRoom', { roomId: roomId.toUpperCase(), gameType: 'chess' }, (res) => {
            if (res.success) {
                setMyRoom(roomId.toUpperCase());
                setInRoom(true);
            } else {
                setError(res.message);
                setTimeout(() => setError(''), 3000);
            }
        });
    };

    const hasConflict = myColor !== 'random' && opponentColor !== 'random' && myColor === opponentColor;
    const canReady = !hasConflict;

    if (inRoom) {
        return (
            <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', margin: '0 0 1rem 0' }}>Trạng thái Bàn cờ</h2>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mã phòng:</p>
                    <h1 style={{ letterSpacing: '4px', color: 'var(--primary-color)', margin: '0.5rem 0' }}>{myRoom}</h1>
                </div>

                {/* Opponent Selection */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16}/> Đối thủ</span>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: isOpponentReady ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}>
                            {isOpponentReady ? 'SẴN SÀNG' : 'CHỜ...'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {['w', 'b', 'random'].map(c => (
                            <div key={c} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', fontSize: '0.85rem',
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
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 'bold', margin: '1rem 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ background: 'var(--bg-color)', padding: '0 10px', position: 'relative' }}>V S</span>
                </div>

                {/* My Selection */}
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: hasConflict ? '1px solid var(--error-color)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>👉 Bạn chọn phe:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {['w', 'b', 'random'].map(c => (
                            <button key={c} onClick={() => updateMyColor(c)} style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '8px', fontSize: '0.85rem',
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
                <button className="btn-secondary" style={{ width: '100%', marginTop: '10px', opacity: 0.7 }} onClick={() => {
                    setInRoom(false); setMyRoom(''); navigate('/chess');
                }}>Rời phòng</button>
            </div>
        );
    }

    // Default Lobby UI (Same as Caro)
    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '450px' }}>
            <h2>Chess Multiplayer</h2>
            
            {!isConnected && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--error-color)', fontSize: '0.85rem' }}>
                    ⚠️ Server chưa kết nối.
                </div>
            )}

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Tạo phòng</h3>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreateRoom}>Tạo phòng mới</button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.5rem 0', width: '100%' }}></div>

            <div style={{ textAlign: 'left', width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Tham gia phòng</h3>
                <input
                    type="text" placeholder="NHẬP MÃ PHÒNG" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())}
                    className="glass-input"
                    style={{ 
                        width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '12px', background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', 
                        textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px' 
                    }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{error}</p>}
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleJoinRoom}>Tham gia ngay</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => navigate('/chess')}>Quay lại</button>
        </div>
    );
}
