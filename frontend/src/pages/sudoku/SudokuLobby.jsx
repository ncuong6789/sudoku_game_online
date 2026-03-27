import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { generateSudoku } from '../../utils/sudoku';

export default function SudokuLobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const [difficulty, setDifficulty] = useState(location.state?.difficulty || 'Medium');
    const [inRoom, setInRoom] = useState(false);
    const [myRoom, setMyRoom] = useState('');
    const [playerCount, setPlayerCount] = useState(1);
    const [isConnected, setIsConnected] = useState(socket.connected);

    const handleCreateRoom = useCallback(() => {
        if (!socket.connected) return;
        socket.emit('createRoom', { difficulty }, (res) => {
            setMyRoom(res.roomId);
            setInRoom(true);
            setPlayerCount(1);
        });
    }, [difficulty]);

    useEffect(() => {
        function onConnect() { setIsConnected(true); }
        function onDisconnect() { setIsConnected(false); }

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
            navigate('/sudoku/multiplayer-game', { state: { initialPuzzle: puzzle, solution, roomId: myRoom, difficulty } });
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('gameStarted', handleGameStarted);

        return () => {
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('gameStarted', handleGameStarted);
        };
    }, [difficulty, navigate, myRoom]);

    if (inRoom) {
        return (
            <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
                <h2 style={{ userSelect: 'text', cursor: 'text' }}>Room: {myRoom}</h2>
                <p>Difficulty: {difficulty}</p>
                <p>Players: {playerCount}/2</p>
                {playerCount < 2 ? (
                    <p style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Waiting for opponent to join...</p>
                ) : (
                    <p style={{ color: 'var(--success-color)', fontWeight: 600 }}>Starting game...</p>
                )}
                <button className="btn-secondary" style={{ marginTop: '20px', width: 'auto' }} onClick={() => {
                    setInRoom(false);
                    setMyRoom('');
                    navigate('/sudoku');
                }}>Leave Room</button>
            </div>
        );
    }

    return (
        <div className="glass-panel menu-container" style={{ maxWidth: '400px' }}>
            <h2>Đang tạo phòng...</h2>
            <div className="loader" style={{ margin: '20px auto' }}></div>
            {!isConnected && <p style={{ color: 'var(--error-color)' }}>⚠️ Mất kết nối server...</p>}
            <button className="btn-secondary" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => navigate('/sudoku')}>Hủy</button>
        </div>
    );
}
