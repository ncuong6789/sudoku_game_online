import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../../utils/socket';
import { ArrowLeft, RotateCcw, MessageSquare, Send, Swords } from 'lucide-react';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    
    // Đếm số ván đã chơi để luân phiên lượt đi
    const [soloGameCount, setSoloGameCount] = useState(0);

    const [realPlayerSymbol, setRealPlayerSymbol] = useState(() => {
        if (mode === 'solo') return 'X';
        return initSymbol || null; // multiplayer
    });

    useEffect(() => {
        if (mode === 'solo') {
            setRealPlayerSymbol(soloGameCount % 2 === 0 ? 'X' : 'O');
        }
    }, [soloGameCount, mode]);

    const humanNum = mode === 'solo' ? (realPlayerSymbol === 'X' ? 1 : 2) : (realPlayerSymbol === 'X' ? 1 : 2);
    const aiNum = mode === 'solo' ? (realPlayerSymbol === 'X' ? 2 : 1) : null;

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

    const checkWinner = (grid, r, c, player) => {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            let line = [{ r, c }];
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++; line.push({ r: nr, c: nc });
                } else break;
            }
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r - dr * i, nc = c - dc * i;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === player) {
                    count++; line.push({ r: nr, c: nc });
                } else break;
            }
            if (count >= WIN_COUNT) return { player, line };
        }
        return null;
    };

    // --- CARO AI V2: MOVE ORDERING + ADVANCED HEURISTIC + NOISE ---
    const evaluateBoardForMoves = (grid, moveR, moveC, player) => {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]; 
        let open3Count = 0;
        let open4Count = 0;

        for (const [dr, dc] of directions) {
            let count = 1;
            let blocked = 0;
            
            // Check forward
            let i = 1;
            while(true) {
                const nr = moveR + dr * i, nc = moveC + dc * i;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) { blocked++; break; }
                if (grid[nr][nc] === player) { count++; i++; }
                else if (grid[nr][nc] !== 0) { blocked++; break; }
                else break; 
            }
            // Check backward
            let j = 1;
            while(true) {
                const nr = moveR - dr * j, nc = moveC - dc * j;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) { blocked++; break; }
                if (grid[nr][nc] === player) { count++; j++; }
                else if (grid[nr][nc] !== 0) { blocked++; break; }
                else break;
            }

            if (count >= 5) score += 1000000;
            else if (count === 4) {
                if (blocked === 0) { score += 100000; open4Count++; }
                else if (blocked === 1) score += 10000;
            } else if (count === 3) {
                if (blocked === 0) { score += 5000; open3Count++; }
                else if (blocked === 1) score += 100;
            } else if (count === 2) {
                if (blocked === 0) score += 50;
                else if (blocked === 1) score += 5;
            }
        }
        
        // Forks: Double 3 or 4-3
        if (open4Count >= 2) score += 500000;
        else if (open4Count >= 1 && open3Count >= 1) score += 100000;
        else if (open3Count >= 2) score += 50000;

        return score;
    };

    const evaluateBoardTotal = (grid) => {
        let totalScore = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (grid[r][c] === aiNum) totalScore += evaluateBoardForMoves(grid, r, c, aiNum);
                else if (grid[r][c] === humanNum) totalScore -= evaluateBoardForMoves(grid, r, c, humanNum) * 1.2; // Ưu tiên phòng thủ
            }
        }
        return totalScore;
    };

    const minimax = (grid, depth, alpha, beta, isMaximizing) => {
        let currentScore = evaluateBoardTotal(grid);
        // Ngưỡng kết thúc sớm hoặc hết depth
        if (depth === 0 || Math.abs(currentScore) >= 1000000) return currentScore;

        const candidates = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (grid[r][c] === 0) {
                    let isNear = false;
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] !== 0) {
                                isNear = true; break;
                            }
                        }
                        if (isNear) break;
                    }
                    if (isNear) {
                        grid[r][c] = isMaximizing ? aiNum : humanNum;
                        // Điểm sơ bộ cho Move Ordering (tính nhanh)
                        const tempScore = evaluateBoardForMoves(grid, r, c, isMaximizing ? aiNum : humanNum) 
                                        + evaluateBoardForMoves(grid, r, c, isMaximizing ? humanNum : aiNum) * 0.8; 
                        grid[r][c] = 0;
                        candidates.push({ r, c, score: tempScore });
                    }
                }
            }
        }

        // Move Ordering: Lấy các nước đi tốt nhất lên trước
        candidates.sort((a, b) => b.score - a.score);
        
        // Cắt giảm Beam Width: Chỉ xét 15 nước đi tiềm năng nhất để tăng cấu hình Depth
        const topCandidates = candidates.slice(0, 15);
        if (topCandidates.length === 0) return 0;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const { r, c } of topCandidates) {
                grid[r][c] = aiNum;
                const ev = minimax(grid, depth - 1, alpha, beta, false);
                grid[r][c] = 0;
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const { r, c } of topCandidates) {
                grid[r][c] = humanNum;
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
        setIsProcessing(true);
        // Delay nhẹ để update UI loading state
        setTimeout(() => {
            const boardCopy = currentBoard.map(row => [...row]);
            let depth = 1;
            if (BOARD_SIZE === 3) depth = difficulty === 'Hard' ? 6 : 3;
            else depth = difficulty === 'Hard' ? 3 : (difficulty === 'Medium' ? 2 : 1); // Depth 3 cho Hard 15x15 nhờ Move Ordering
            // depth 3 tương đối mạnh mẽ ở Gomoku với Beam Search = 15
            
            let bestScore = -Infinity;
            let bestMove = null;

            const candidates = [];
            let emptyCount = 0;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (boardCopy[r][c] === 0) {
                        emptyCount++;
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
                        if (isNear) {
                            boardCopy[r][c] = aiNum;
                            // Move ordering base score + Center bias & Random Noise
                            const centerDist = Math.abs(r - Math.floor(BOARD_SIZE/2)) + Math.abs(c - Math.floor(BOARD_SIZE/2));
                            const heuristicVal = evaluateBoardForMoves(boardCopy, r, c, aiNum) 
                                               + evaluateBoardForMoves(boardCopy, r, c, humanNum)*1.2 
                                               - centerDist * 0.5 
                                               + Math.random() * 5; // Noise: Tránh lặp lại lối mòn
                            boardCopy[r][c] = 0;
                            candidates.push({ r, c, score: heuristicVal });
                        }
                    }
                }
            }

            // Mở màn: Đánh trung tâm (hoặc ngẫu nhiên gần trung tâm) nếu chưa ai đi
            if (emptyCount === BOARD_SIZE * BOARD_SIZE) {
                const center = Math.floor(BOARD_SIZE/2);
                const offsetR = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                const offsetC = Math.floor(Math.random() * 3) - 1;
                bestMove = { r: center + offsetR, c: center + offsetC };
            } else {
                candidates.sort((a, b) => b.score - a.score);
                const searchCandidates = candidates.slice(0, 15);

                for (const { r, c } of searchCandidates) {
                    boardCopy[r][c] = aiNum;
                    const score = minimax(boardCopy, depth - 1, -Infinity, Infinity, false);
                    boardCopy[r][c] = 0;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { r, c };
                    }
                }
            }

            if (bestMove) {
                applyAIMove(currentBoard, bestMove);
            } else {
                setIsProcessing(false);
            }
        }, 50); 
    }, [difficulty, BOARD_SIZE, aiNum, humanNum]);

    const applyAIMove = (currentBoard, move) => {
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[move.r][move.c] = aiNum; 
        setBoard(newBoard);
        setIsProcessing(false); 
        const win = checkWinner(newBoard, move.r, move.c, aiNum);
        if (win) {
            setWinner(aiNum);
            setWinningLine(win.line);
            setIsGameOver(true);
            playSound('lose');
        } else {
            // Xác nhận lượt đi bằng phép tính chẵn lẻ an toàn
            const filledCells = newBoard.flat().filter(v => v !== 0).length;
            setIsXNext(filledCells % 2 === 0);
        }
    };

    // AI Check: X luôn đi trước. Tùy thuộc người hay máy cầm X để trigger lượt đầu.
    useEffect(() => {
        if (mode === 'solo' && !isGameOver && !isProcessing) {
            const filledCells = board.flat().filter(v => v !== 0).length;
            // Ở Caro truyền thống, X luộn đi trước (số ô trống lẻ => tới O, chẵn => tới X).
            const currentTurnNum = filledCells % 2 === 0 ? 1 : 2; 
            
            if (currentTurnNum === aiNum) {
                makeAIMove(board);
            }
        }
    }, [board, mode, isGameOver, isProcessing, aiNum, makeAIMove]);

    // Multiplayer Socket logic
    useEffect(() => {
        if (mode === 'multiplayer') {
            socket.on('caroGameStarted', ({ playerSymbol: sym }) => {
                if (sym) setRealPlayerSymbol(sym);
            });

            socket.on('caroMoved', ({ r, c, grid }) => {
                setBoard(grid);
                const filledCells = grid.flat().filter(v => v !== 0).length;
                setIsXNext(filledCells % 2 === 0); 
                const win = checkWinner(grid, r, c, grid[r][c]);
                if (win) {
                    setWinner(grid[r][c]);
                    setWinningLine(win.line);
                    setIsGameOver(true);
                    const mySymbolNum = realPlayerSymbol === 'X' ? 1 : 2;
                    playSound(grid[r][c] === mySymbolNum ? 'win' : 'lose');
                }
            });

            socket.on('receiveMessage', (msg) => {
                setMessages(prev => [...prev, msg]);
            });

            socket.on('opponentDisconnected', () => {
                if (!isGameOver) {
                    setIsGameOver(true);
                    setWinner(realPlayerSymbol === 'X' ? 1 : 2);
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
    }, [mode, realPlayerSymbol, isGameOver]);

    useEffect(() => {
        return () => {
            if (roomId) socket.emit('leaveRoom', roomId);
        };
    }, [roomId]);

    const handleCellClick = (r, c) => {
        if (board[r][c] !== 0 || isGameOver || isProcessing) return;
        
        const filledCells = board.flat().filter(v => v !== 0).length;
        const currentTurnNum = filledCells % 2 === 0 ? 1 : 2; 
        
        if (mode === 'solo' && currentTurnNum !== humanNum) return;
        if (mode === 'multiplayer' && currentTurnNum !== humanNum) return;

        setIsProcessing(true); 
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = currentTurnNum;
        setBoard(newBoard);

        const win = checkWinner(newBoard, r, c, currentTurnNum);
        if (win) {
            setWinner(currentTurnNum);
            setWinningLine(win.line);
            setIsGameOver(true);
            setIsProcessing(false);
            playSound(currentTurnNum === humanNum ? 'win' : 'lose'); 
        } else {
            setIsXNext(!isXNext);
            if (mode === 'multiplayer') {
                setIsProcessing(false);
                socket.emit('caroMove', { r, c, roomId, grid: newBoard });
            } else {
                setIsProcessing(false); // Effect loop takes over
            }
        }
    };

    const resetGame = () => {
        stopAudio();
        setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        setIsGameOver(false);
        setIsProcessing(false);
        
        if (mode === 'solo') {
            setSoloGameCount(prev => prev + 1);
        }
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
                position: 'relative',
                overflow: 'hidden',
                width: 'fit-content', 
                height: 'fit-content', 
                display: 'flex', 
                flexDirection: 'row', 
                padding: '1rem', 
                gap: '1.5rem', 
                alignItems: 'stretch',
                flexWrap: 'wrap',
                justifyContent: 'center'
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
                        width: 'min(calc(100vh - 150px), calc(100vw - 320px))',
                        height: 'min(calc(100vh - 150px), calc(100vw - 320px))',
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
                                        fontSize: `calc(min(calc(100vh - 150px), calc(100vw - 320px)) / ${BOARD_SIZE} * 0.7)`,
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
                </div>

                {/* PHẢI: ĐIỀU KHIỂN & CHAT */}
                <div style={{ flex: '1 1 250px', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'min(calc(100vh - 150px), calc(100vw - 320px))' }}>
                    
                    {/* Header Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="nav-item active" style={{ padding: '10px', display: 'flex', alignSelf: 'center', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            <Swords size={20} /> Caro {BOARD_SIZE}x{BOARD_SIZE}
                        </div>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {mode === 'solo' ? `Thách đấu AI (${difficulty})` : `Phòng: ${roomId}`}
                        </div>

                        {/* Badge người chơi X/O */}
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(79,172,254,0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(79,172,254,0.3)' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, color: realPlayerSymbol === 'X' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1 }}>{realPlayerSymbol || 'X'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Bạn</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 'bold' }}>vs</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,71,87,0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,71,87,0.2)' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, color: realPlayerSymbol === 'O' ? 'var(--primary-color)' : '#ff4757', lineHeight: 1 }}>{realPlayerSymbol === 'X' ? 'O' : 'X'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{mode === 'solo' ? 'Bot' : 'Đối thủ'}</span>
                            </div>
                        </div>

                        {!isGameOver && (
                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: isXNext ? 'var(--primary-color)' : '#ff4757', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                Lượt thứ: <strong>{(board.flat().filter(v => v !== 0).length) + 1}</strong>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '8px', color: 'var(--text-secondary)' }}>
                                    {(isXNext && realPlayerSymbol === 'X') || (!isXNext && realPlayerSymbol === 'O') ? '👉 Lượt của bạn!' : (isProcessing ? '⏳ Bot đang tính toán...' : '⏳ Đang chờ...')}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                            <button className="btn-primary" onClick={resetGame} style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <RotateCcw size={18} /> {isGameOver ? `Chơi ván ${soloGameCount + 2}` : 'Bỏ cuộc & Chơi ván mới'}
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

                {/* GAME OVER FULL PANEL OVERLAY */}
                {isGameOver && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(8px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 100, gap: '20px'
                    }}>
                        <div style={{ fontSize: '5rem', animation: 'float 3s ease-in-out infinite' }}>
                            {winner === humanNum ? '🏆' : '💀'}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '3rem', color: winner === humanNum ? 'var(--primary-color)' : '#ff4757', textAlign: 'center', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            {winner === humanNum ? 'Bạn Thắng!' : 'Bạn Thua!'}
                        </h2>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                            <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={resetGame}>
                                <RotateCcw size={24} /> Chơi ván {soloGameCount + 2}
                            </button>
                            <button className="btn-secondary" style={{ padding: '16px 36px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={handleExit}>
                                <ArrowLeft size={24} /> Thoát
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
