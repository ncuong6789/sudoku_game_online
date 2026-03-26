import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { generateSudoku } from '../../utils/sudoku';

export default function SudokuLobby() {
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
                // Host generates the board
                const { puzzle, solution } = generateSudoku(difficulty);
                socket.emit('startGame', { puzzle, solution });
            }
        };

        const handleGameStarted = ({ puzzle, solution }) => {
            navigate('/sudoku/multiplayer-game', { state: { initialPuzzle: puzzle, roomId: myRoom, difficulty } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('gameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('gameStarted', handleGameStarted);
        };
    }, [difficulty, navigate, myRoom]);

    const handleCreateRoom = () => {
        socket.emit('createRoom', { difficulty }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
            setPlayerCount(1);
        });
    };

    const handleJoinRoom = () => {
        if (!roomId) return;
        setError('');
        socket.emit('joinRoom', { roomId }, (res) => {
            if (res.success) {
                setMyRoom(roomId);
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
                <h2>Room: {myRoom}</h2>
                <p>Difficulty: {difficulty}</p>
                <p>Players: {playerCount}/2</p>
                {playerCount < 2 ? (
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Waiting for opponent to join...</p>
                ) : (
                    <p style={{ color: 'var(--success-color)', fontWeight: 600 }}>Starting game...</p>
                )}
                <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    // Emit disconnect/leave room if server supported it, else just go back
                    navigate('/sudoku');
                }}>Leave Room</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Multiplayer</h2>
            
            {!isConnected && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--error-color)', fontSize: '0.9rem' }}>
                    ⚠️ Server chưa kết nối. Bạn cần triển khai Backend (Node.js) lên một server (như Render) để chơi Online.
                </div>
            )}
            <div style={{ marginBottom: '10px', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Create match</h3>
                <select 
                    value={difficulty} 
                    onChange={e => setDifficulty(e.target.value)} 
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '8px', 
                        background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', 
                        appearance: 'none', cursor: 'pointer', boxSizing: 'border-box'
                    }}
                >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                </select>
                <button className="btn-primary" style={{ padding: '10px' }} onClick={handleCreateRoom}>Create Room</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
            <div style={{ textAlign: 'left' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Join match</h3>
                <input
                    type="text"
                    placeholder="ENTER ROOM CODE"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())}
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '8px', 
                        background: '#1e293b', color: 'white', border: '1px solid var(--border-color)', 
                        textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box'
                    }}
                />
                {error && <p style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>{error}</p>}
                <button className="btn-primary" style={{ padding: '10px' }} onClick={handleJoinRoom}>Join Room</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '1rem', padding: '10px' }} onClick={() => navigate('/sudoku')}>Back to Menu</button>
        </div>
    );
}
