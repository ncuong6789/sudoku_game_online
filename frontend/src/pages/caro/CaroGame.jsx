import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, MessageSquare, Send, User, Bot, Swords } from 'lucide-react';

// Remove fixed BOARD_SIZE constant, move inside component for dynamic sizing

export default function CaroGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty, gridSize, playerSymbol: initSymbol } = location.state || { mode: 'solo', difficulty: 'Medium', gridSize: 15 };

    const BOARD_SIZE = gridSize || 15;
    const WIN_COUNT = BOARD_SIZE === 3 ? 3 : 5;

    const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    const [isXNext, setIsXNext] = useState(true); // X moves first
    const [winner, setWinner] = useState(null);
    const [winningLine, setWinningLine] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [playerSymbol, setPlayerSymbol] = useState(null); // 'X' or 'O' for multiplayer

    const audioRef = useRef(null);
    const chatEndRef = useRef(null);
    const winAudioRef = useRef(new Audio('/win.mp3'));
    const loseAudioRef = useRef(new Audio('/lose.mp3'));

    useEffect(() => {
        winAudioRef.current.load();
        loseAudioRef.current.load();
    }, []);

    const playSound = (type) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        const audio = type === 'win' ? winAudioRef.current : loseAudioRef.current;
        audio.currentTime = 0;
        audioRef.current = audio;
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    useEffect(() => {
        return () => {
            stopAudio();
        };
    }, []);

    // Win detection
    const checkWinner = (grid, r, c, player) => {
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal \
            [1, -1]  // Diagonal /
        ];

        for (const [dr, dc] of directions) {
            let count = 1;
            let line = [{ r, c }];

            // Check forward
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++;
                    line.push({ r: nr, c: nc });
                } else break;
            }

            // Check backward
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r - dr * i;
                const nc = c - dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++;
                    line.push({ r: nr, c: nc });
                } else break;
            }

            if (count >= WIN_COUNT) return { player, line };
        }
        return null;
    };

    // Simple AI for Solo mode
    const makeAIMove = useCallback((currentBoard) => {
        // Handle Easy mode: make a random move 40% of the time
        if (difficulty === 'Easy' && Math.random() < 0.4) {
            const emptyCells = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
                }
            }
            if (emptyCells.length > 0) {
                const move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                applyAIMove(currentBoard, move);
                return;
            }
        }

        // Find best move for Medium/Hard
        let bestScore = -1;
        let move = null;
        const searchRadius = difficulty === 'Hard' ? 2 : 1; 

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === 0) {
                    let score = 0;
                    // Focus search around stones to speed up
                    let nearStone = false;
                    for (let dr = -searchRadius; dr <= searchRadius; dr++) {
                        for (let dc = -searchRadius; dc <= searchRadius; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && currentBoard[nr][nc] !== 0) {
                                score += currentBoard[nr][nc] === 2 ? 3 : 2; // AI moves/blocking
                                nearStone = true;
                            }
                        }
                    }
                    if (!nearStone && difficulty !== 'Easy') continue; 
                    
                    if (score > bestScore) {
                        bestScore = score;
                        move = { r, c };
                    }
                }
            }
        }

        if (move) applyAIMove(currentBoard, move);
    }, [difficulty, BOARD_SIZE]);

    const applyAIMove = (currentBoard, move) => {
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[move.r][move.c] = 2; // AI is O (2)
        setBoard(newBoard);
        const win = checkWinner(newBoard, move.r, move.c, 2);
        if (win) {
            setWinner(2);
            setWinningLine(win.line);
            setIsGameOver(true);
            playSound('lose');
        } else {
            setIsXNext(true);
        }
    };

    // Multiplayer Socket logic
    useEffect(() => {
        if (mode === 'multiplayer') {
            socket.on('caroUpdateMove', ({ r, c, grid, nextSymbol }) => {
                setBoard(grid);
                setIsXNext(nextSymbol === 'X');
                const win = checkWinner(grid, r, c, grid[r][c]);
                if (win) {
                    setWinner(grid[r][c]);
                    setWinningLine(win.line);
                    setIsGameOver(true);
                    // Determine if I won or lost
                    const mySymbolNum = playerSymbol === 'X' ? 1 : 2;
                    playSound(grid[r][c] === mySymbolNum ? 'win' : 'lose');
                }
            });

            socket.on('receiveMessage', (msg) => {
                setMessages(prev => [...prev, msg]);
            });

            // If we are joining, we might need our symbol
            // For simplicity, let's say Creator is X, Joiner is O
            // We'll handle this in the lobby or first join
        }

        return () => {
            if (mode === 'multiplayer') {
                socket.off('caroUpdateMove');
                socket.off('receiveMessage');
            }
        };
    }, [mode, playerSymbol, checkWinner]);

    const handleCellClick = (r, c) => {
        if (board[r][c] !== 0 || isGameOver) return;
        
        // Multiplayer turn guard
        if (mode === 'multiplayer') {
            const currentSymbol = isXNext ? 'X' : 'O';
            if (playerSymbol && currentSymbol !== playerSymbol) {
                 return;
            }
        }

        const newBoard = board.map(row => [...row]);
        const currentPlayer = isXNext ? 1 : 2;
        newBoard[r][c] = currentPlayer;
        setBoard(newBoard);

        const win = checkWinner(newBoard, r, c, currentPlayer);
        if (win) {
            setWinner(currentPlayer);
            setWinningLine(win.line);
            setIsGameOver(true);
            playSound(currentPlayer === 1 ? 'win' : 'lose'); // Simplistic for solo
        } else {
            setIsXNext(!isXNext);
            if (mode === 'solo' && isXNext) {
                setTimeout(() => makeAIMove(newBoard), 500);
            }
        }

        if (mode === 'multiplayer') {
            socket.emit('caroMove', { r, c, roomId, grid: newBoard });
        }
    };

    const resetGame = () => {
        stopAudio();
        setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        setIsGameOver(false);
    };

    const handleExit = () => {
        stopAudio();
        navigate(mode === 'multiplayer' ? '/caro/multiplayer' : '/caro');
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: 'calc(100vh - 80px)', padding: '0.5rem' }}>
            <div className="glass-panel" style={{ 
                width: 'fit-content', 
                height: 'fit-content', 
                display: 'flex', 
                flexDirection: 'row', 
                padding: '1rem', 
                gap: '1.5rem', 
                alignItems: 'stretch' 
            }}>
                
                {/* TRÁI: BÀN CỜ GIGANTIC */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0 }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                        gap: BOARD_SIZE >= 30 ? '0px' : (BOARD_SIZE > 15 ? '1px' : '2px'),
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: BOARD_SIZE >= 30 ? '0' : '2px',
                        borderRadius: '4px',
                        
                        /* CÔNG THỨC CSS TỐI THƯỢNG CHO HÌNH VUÔNG TRÀN VIỀN */
                        width: 'min(calc(100vh - 130px), calc(100vw - 400px))',
                        height: 'min(calc(100vh - 130px), calc(100vw - 400px))',
                        
                        margin: 0
                    }}>
                        {board.map((row, r) => row.map((cell, c) => {
                            const isWinCell = winningLine?.some(coord => coord.r === r && coord.c === c);
                            return (
                                <div 
                                    key={`${r}-${c}`}
                                    className="caro-cell"
                                    onClick={() => handleCellClick(r, c)}
                                    style={{
                                        background: isWinCell ? 'rgba(var(--primary-color-rgb), 0.4)' : 'rgba(20, 20, 30, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: BOARD_SIZE >= 30 ? '0.9rem' : (BOARD_SIZE > 15 ? '1.5rem' : '2.5rem'),
                                        fontWeight: 'bold',
                                        cursor: cell === 0 && !isGameOver ? 'pointer' : 'default',
                                        color: cell === 1 ? 'var(--primary-color)' : '#ff4757',
                                        transition: 'background 0.2s',
                                        border: BOARD_SIZE >= 30 ? '0.5px solid rgba(255,255,255,0.03)' : 'none',
                                        boxSizing: 'border-box',
                                        lineHeight: 1,
                                        overflow: 'hidden'
                                    }}
                                >
                                    {cell === 1 ? 'X' : cell === 2 ? 'O' : '\u00A0'}
                                </div>
                            );
                        }))}
                    </div>
                </div>

                {/* PHẢI: ĐIỀU KHIỂN & CHAT */}
                <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'min(calc(100vh - 130px), calc(100vw - 400px))' }}>
                    
                    {/* Header Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="nav-item active" style={{ padding: '10px', display: 'flex', justifySelf: 'center', alignSelf: 'center', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <Swords size={20} /> Caro {BOARD_SIZE}x{BOARD_SIZE}
                        </div>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {mode === 'solo' ? 'Thách đấu AI' : `Phòng: ${roomId}`}
                        </div>

                        {!isGameOver && (
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.4rem', color: isXNext ? 'var(--primary-color)' : '#ff4757', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                Lượt {isXNext ? 'X' : 'O'}
                            </div>
                        )}

                        {isGameOver && (
                            <div style={{ textAlign: 'center', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <h2 style={{ color: winner === 1 ? 'var(--primary-color)' : '#ff4757', margin: 0, fontSize: '1.6rem' }}>
                                    {winner === 1 ? 'X THẮNG!' : 'O THẮNG!'}
                                </h2>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            <button className="btn-primary" onClick={resetGame} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <RotateCcw size={18} /> {isGameOver ? 'Chơi ván mới' : 'Reset'}
                            </button>
                            <button className="btn-secondary" onClick={handleExit} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <ArrowLeft size={18} /> Thoát
                            </button>
                        </div>
                    </div>

                    {/* Chat Box HOẶC Status Kết quả */}
                    {mode === 'multiplayer' && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <MessageSquare size={18} />
                                <span style={{ fontWeight: 'bold' }}>Trò chuyện</span>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {messages.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto' }}>Gửi lời chào nhau nhé!</p>}
                                {messages.map((msg, idx) => (
                                    <div key={idx} style={{ 
                                        padding: '8px 12px', 
                                        background: msg.sender === socket.id ? 'rgba(var(--primary-color-rgb), 0.2)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        alignSelf: msg.sender === socket.id ? 'flex-end' : 'flex-start',
                                        maxWidth: '90%',
                                        fontSize: '0.9rem',
                                        wordWrap: 'break-word'
                                    }}>
                                        {msg.message}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input 
                                    type="text"
                                    className="glass-input"
                                    placeholder="Giao tiếp..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (()=>{
                                        if(!inputMessage.trim()) return;
                                        const msgObj = { message: inputMessage, sender: socket.id };
                                        socket.emit('sendMessage', { roomId, ...msgObj });
                                        setMessages(prev => [...prev, msgObj]);
                                        setInputMessage('');
                                    })()}
                                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.9rem' }}
                                />
                                <button className="btn-primary" style={{ padding: '0 12px', borderRadius: '8px' }} onClick={()=>{
                                    if(!inputMessage.trim()) return;
                                    const msgObj = { message: inputMessage, sender: socket.id };
                                    socket.emit('sendMessage', { roomId, ...msgObj });
                                    setMessages(prev => [...prev, msgObj]);
                                    setInputMessage('');
                                }}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
