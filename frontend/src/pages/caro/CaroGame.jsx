import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, MessageSquare, Send, User, Bot, Swords } from 'lucide-react';

const BOARD_SIZE = 15;

export default function CaroGame() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, roomId, difficulty } = location.state || { mode: 'solo', difficulty: 'Medium' };

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
        if (audioRef.current) audioRef.current.pause();
        const audio = type === 'win' ? winAudioRef.current : loseAudioRef.current;
        audio.currentTime = 0;
        audioRef.current = audio;
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

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
            let line = [[r, c]];

            // Check forward
            for (let i = 1; i < 5; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++;
                    line.push([nr, nc]);
                } else break;
            }

            // Check backward
            for (let i = 1; i < 5; i++) {
                const nr = r - dr * i;
                const nc = c - dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++;
                    line.push([nr, nc]);
                } else break;
            }

            if (count >= 5) return { player, line };
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
    }, [difficulty]);

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
    }, [mode, playerSymbol]);

    const handleCellClick = (r, c) => {
        if (board[r][c] !== 0 || isGameOver) return;
        
        // Multiplayer turn guard
        if (mode === 'multiplayer') {
            const currentSymbol = isXNext ? 'X' : 'O';
            // Need to know my symbol. For now handle in MultiplayerGame logic pattern
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
        setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        setIsGameOver(false);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="game-container" style={{ maxWidth: '1400px', padding: '1rem' }}>
            <div className="main-play-area" style={{ gap: '2rem' }}>
                {/* Board Column */}
                <div className="glass-panel" style={{ padding: '1rem', flex: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className={`nav-item active`} style={{ padding: '8px 15px' }}>
                                <Swords size={18} /> Caro 15x15
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {mode === 'solo' ? 'Thách đấu AI' : `Phòng: ${roomId}`}
                            </span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: isXNext ? 'var(--primary-color)' : '#ff4757' }}>
                            Lượt: {isXNext ? 'X (Đỏ)' : 'O (Xanh)'}
                        </div>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${BOARD_SIZE}, 40px)`,
                        gridTemplateRows: `repeat(${BOARD_SIZE}, 40px)`,
                        gap: '1px',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '1px',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        {board.map((row, r) => row.map((cell, c) => {
                            const isWinCell = winningLine?.some(([wr, wc]) => wr === r && wc === c);
                            return (
                                <div 
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        background: isWinCell ? 'rgba(var(--primary-color-rgb), 0.4)' : 'rgba(20, 20, 30, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        cursor: cell === 0 && !isGameOver ? 'pointer' : 'default',
                                        color: cell === 1 ? 'var(--primary-color)' : '#ff4757',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
                                </div>
                            );
                        }))}
                    </div>
                </div>

                {/* Info & Chat Column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '350px' }}>
                    {/* Status & Actions */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        {isGameOver ? (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: winner === 1 ? 'var(--primary-color)' : '#ff4757' }}>
                                    {winner === 1 ? 'X CHIẾN THẮNG!' : 'O CHIẾN THẮNG!'}
                                </h2>
                                <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={resetGame}>
                                    Chơi ván mới
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ marginBottom: '1rem' }}>Bảng điều khiển</h3>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={resetGame}>
                                        <RotateCcw size={18} /> Reset
                                    </button>
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/caro')}>
                                        Thoát
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Box */}
                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', maxHeight: '500px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                            <MessageSquare size={18} />
                            <span style={{ fontWeight: 'bold' }}>Trò chuyện</span>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {messages.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.8rem' }}>Hãy gửi lời chào tới đối thủ!</p>}
                            {messages.map((msg, idx) => (
                                <div key={idx} style={{ 
                                    padding: '8px 12px', 
                                    background: msg.sender === socket.id ? 'rgba(var(--primary-color-rgb), 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    alignSelf: msg.sender === socket.id ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    fontSize: '0.9rem'
                                }}>
                                    {msg.message}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text"
                                className="glass-input"
                                placeholder="Nhập tin nhắn..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (()=>{
                                    if(!inputMessage.trim()) return;
                                    const msgObj = { message: inputMessage, sender: socket.id };
                                    socket.emit('sendMessage', { roomId, ...msgObj });
                                    setMessages(prev => [...prev, msgObj]);
                                    setInputMessage('');
                                })()}
                                style={{ flex: 1, padding: '10px' }}
                            />
                            <button className="btn-primary" style={{ padding: '10px' }} onClick={()=>{
                                if(!inputMessage.trim()) return;
                                const msgObj = { message: inputMessage, sender: socket.id };
                                socket.emit('sendMessage', { roomId, ...msgObj });
                                setMessages(prev => [...prev, msgObj]);
                                setInputMessage('');
                            }}>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
