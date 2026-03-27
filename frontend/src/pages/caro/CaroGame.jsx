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
    const [isProcessing, setIsProcessing] = useState(false); // Guard for double-clicks/AI racing
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [playerSymbol, setPlayerSymbol] = useState(initSymbol || null); // 'X' or 'O' for multiplayer

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

    // --- THUẬT TOÁN AI MINIMAX CHO CARO ---
    const evaluateBoard = (grid, size) => {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]; 
        
        const weights = {
            ai5: 10000000,
            opp5: -9000000,
            ai4Open: 100000,
            opp4Open: -800000, // ƯU TIÊN CHẶN 4 MỞ
            ai4Blocked: 10000,
            opp4Blocked: -50000,
            ai3Open: 5000,
            opp3Open: -40000, // ƯU TIÊN CHẶN 3 MỞ
            ai3Blocked: 500,
            opp3Blocked: -1000,
            ai2Open: 100,
            opp2Open: -200
        };

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === 0) continue;
                const p = grid[r][c];

                for (const [dr, dc] of directions) {
                    let count = 1;
                    for (let i = 1; i < 5; i++) {
                        const nr = r + dr * i, nc = c + dc * i;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === p) count++;
                        else break;
                    }
                    
                    if (count >= 2) {
                        const rBefore = r - dr, cBefore = c - dc;
                        const rAfter = r + dr * count, cAfter = c + dc * count;
                        
                        let openEnds = 0;
                        if (rBefore >= 0 && rBefore < size && cBefore >= 0 && cBefore < size && grid[rBefore][cBefore] === 0) openEnds++;
                        if (rAfter >= 0 && rAfter < size && cAfter >= 0 && cAfter < size && grid[rAfter][cAfter] === 0) openEnds++;

                        let val = 0;
                        if (count >= 5) val = p === 2 ? weights.ai5 : weights.opp5;
                        else if (count === 4) {
                            if (openEnds === 2) val = p === 2 ? weights.ai4Open : weights.opp4Open;
                            else if (openEnds === 1) val = p === 2 ? weights.ai4Blocked : weights.opp4Blocked;
                        } else if (count === 3) {
                            if (openEnds === 2) val = p === 2 ? weights.ai3Open : weights.opp3Open;
                            else if (openEnds === 1) val = p === 2 ? weights.ai3Blocked : weights.opp3Blocked;
                        } else if (count === 2) {
                            if (openEnds === 2) val = p === 2 ? weights.ai2Open : weights.opp2Open;
                        }
                        score += val;
                    }
                }
            }
        }
        return score;
    };

    const minimax = (grid, depth, alpha, beta, isMaximizing) => {
        const score = evaluateBoard(grid, BOARD_SIZE);
        if (depth === 0 || Math.abs(score) > 5000000) return score;

        const candidates = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (grid[r][c] === 0) {
                    let isNear = false;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] !== 0) {
                                isNear = true; break;
                            }
                        }
                        if (isNear) break;
                    }
                    if (isNear) candidates.push({ r, c });
                }
            }
        }

        if (candidates.length === 0) return 0;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const { r, c } of candidates) {
                grid[r][c] = 2;
                const ev = minimax(grid, depth - 1, alpha, beta, false);
                grid[r][c] = 0;
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const { r, c } of candidates) {
                grid[r][c] = 1;
                const ev = minimax(grid, depth - 1, alpha, beta, true);
                grid[r][c] = 0;
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const makeAIMove = useCallback((currentBoard) => {
        const boardCopy = currentBoard.map(row => [...row]);
        const depth = difficulty === 'Hard' ? 2 : (difficulty === 'Medium' ? 1 : 0);
        
        let bestScore = -Infinity;
        let bestMove = null;

        const candidates = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardCopy[r][c] === 0) {
                    let isNear = false;
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && boardCopy[nr][nc] !== 0) {
                                isNear = true; break;
                            }
                        }
                        if (isNear) break;
                    }
                    if (isNear || (r === Math.floor(BOARD_SIZE/2) && c === Math.floor(BOARD_SIZE/2))) candidates.push({ r, c });
                }
            }
        }

        for (const { r, c } of candidates) {
            boardCopy[r][c] = 2;
            const score = minimax(boardCopy, depth, -Infinity, Infinity, false);
            boardCopy[r][c] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = { r, c };
            }
        }

        if (bestMove) applyAIMove(currentBoard, bestMove);
    }, [difficulty, BOARD_SIZE]);

    const applyAIMove = (currentBoard, move) => {
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[move.r][move.c] = 2; // AI is O (2)
        setBoard(newBoard);
        setIsProcessing(false); // Done processing move
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
            // Nhận lại playerSymbol nếu vào game từ lobby (không phải từ random matchmaking)
            socket.on('caroGameStarted', ({ playerSymbol: sym }) => {
                if (sym) setPlayerSymbol(sym);
            });

            // Event đúng: server phát 'caroMoved'
            socket.on('caroMoved', ({ r, c, grid }) => {
                setBoard(grid);
                // Tính lượt tiếp theo dựa vào board state
                const filledCells = grid.flat().filter(v => v !== 0).length;
                setIsXNext(filledCells % 2 === 0); // X đi trước (số chẵn ô đã đánh → X đến lượt)
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

            socket.on('opponentDisconnected', () => {
                if (!isGameOver) {
                    setIsGameOver(true);
                    setWinner(playerSymbol === 'X' ? 1 : 2);
                }
            });
        }

        return () => {
            if (mode === 'multiplayer') {
                socket.off('caroGameStarted');
                socket.off('caroMoved');
                socket.off('receiveMessage');
                socket.off('opponentDisconnected');
            }
        };
    }, [mode, playerSymbol, isGameOver]);

    useEffect(() => {
        return () => {
            if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    const handleCellClick = (r, c) => {
        if (board[r][c] !== 0 || isGameOver || isProcessing) return;
        
        // Multiplayer turn guard
        if (mode === 'multiplayer') {
            const currentSymbol = isXNext ? 'X' : 'O';
            if (playerSymbol && currentSymbol !== playerSymbol) {
                 return;
            }
        }

        setIsProcessing(true); // Start processing
        const newBoard = board.map(row => [...row]);
        const currentPlayer = isXNext ? 1 : 2;
        newBoard[r][c] = currentPlayer;
        setBoard(newBoard);

        const win = checkWinner(newBoard, r, c, currentPlayer);
        if (win) {
            setWinner(currentPlayer);
            setWinningLine(win.line);
            setIsGameOver(true);
            setIsProcessing(false);
            playSound(currentPlayer === 1 ? 'win' : 'lose'); 
        } else {
            setIsXNext(!isXNext);
            if (mode === 'solo' && isXNext) {
                setTimeout(() => makeAIMove(newBoard), 500);
            } else {
                setIsProcessing(false); // Manual/Multiplayer done
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0, position: 'relative' }}>
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
                                        // fontSize DYNAMIC: 
                                        // Board size is min(calc(100vh - 130px), calc(100vw - 400px))
                                        // Let's use vmin to approximate or just a formula based on grid count
                                        fontSize: `calc(min(calc(100vh - 130px), calc(100vw - 400px)) / ${BOARD_SIZE} * 0.7)`,
                                        fontWeight: 900,
                                        cursor: cell === 0 && !isGameOver && !isProcessing ? 'pointer' : 'default',
                                        color: cell === 1 ? 'var(--primary-color)' : '#ff4757',
                                        transition: 'background 0.2s',
                                        border: BOARD_SIZE >= 20 ? '0.5px solid rgba(255,255,255,0.03)' : 'none',
                                        boxSizing: 'border-box',
                                        lineHeight: 1,
                                        overflow: 'hidden',
                                        userSelect: 'none'
                                    }}
                                >
                                    {cell === 1 ? 'X' : cell === 2 ? 'O' : ''}
                                </div>
                            );
                        }))}
                    </div>

                    {/* GAME OVER OVERLAY */}
                    {isGameOver && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(13, 17, 23, 0.88)', backdropFilter: 'blur(4px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '4px', zIndex: 20, gap: '14px'
                        }}>
                            <div style={{ fontSize: '4rem' }}>
                                {mode === 'multiplayer'
                                    ? (winner === (playerSymbol === 'X' ? 1 : 2) ? '🏆' : '💀')
                                    : (winner === 1 ? '🏆' : '💀')}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '2.5rem', color: winner === 1 ? 'var(--primary-color)' : '#ff4757' }}>
                                {mode === 'multiplayer'
                                    ? (winner === (playerSymbol === 'X' ? 1 : 2) ? 'Bạn Thắng!' : 'Bạn Thua!')
                                    : (winner === 1 ? 'X Thắng!' : 'O Thắng!')}
                            </h2>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                                <button className="btn-primary" style={{ 
                                    padding: '12px 28px', 
                                    fontSize: '1.1rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px',
                                    whiteSpace: 'nowrap',
                                    minWidth: '160px',
                                    justifyContent: 'center'
                                }} onClick={resetGame}>
                                    <RotateCcw size={20} /> Chơi lại
                                </button>
                                <button className="btn-secondary" style={{ 
                                    padding: '12px 28px', 
                                    fontSize: '1.1rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px',
                                    whiteSpace: 'nowrap',
                                    minWidth: '160px',
                                    justifyContent: 'center'
                                }} onClick={handleExit}>
                                    <ArrowLeft size={20} /> Thoát
                                </button>
                            </div>
                        </div>
                    )}
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

                        {/* Badge người chơi X/O */}
                        {mode === 'multiplayer' && playerSymbol && (
                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(79,172,254,0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(79,172,254,0.3)' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: playerSymbol === 'X' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1 }}>{playerSymbol}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Bạn</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>vs</div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,71,87,0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,71,87,0.2)' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: playerSymbol === 'O' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1 }}>{playerSymbol === 'X' ? 'O' : 'X'}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Đối thủ</span>
                                </div>
                            </div>
                        )}

                        {mode === 'solo' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', align: 'center', gap: '6px', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-color)' }}>X</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bạn</span>
                                </div>
                                <span style={{ color: 'var(--text-secondary)' }}>vs</span>
                                <div style={{ display: 'flex', align: 'center', gap: '6px', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ff4757' }}>O</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI</span>
                                </div>
                            </div>
                        )}

                        {!isGameOver && (
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: isXNext ? 'var(--primary-color)' : '#ff4757', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                Lượt: <strong>{isXNext ? 'X' : 'O'}</strong>
                                {mode === 'multiplayer' && playerSymbol && (
                                    <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '4px', color: 'var(--text-secondary)' }}>
                                        {(isXNext && playerSymbol === 'X') || (!isXNext && playerSymbol === 'O') ? '👉 Lượt của bạn!' : '⏳ Đang chờ đối thủ...'}
                                    </div>
                                )}
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
