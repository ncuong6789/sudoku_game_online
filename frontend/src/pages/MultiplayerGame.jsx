import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import Controls from '../components/Controls';
import { socket } from '../utils/socket';
import { useRef } from 'react';

export default function MultiplayerGame() {
    const { state } = useLocation();
    const navigate = useNavigate();

    const initialPuzzle = state?.puzzle;
    const solution = state?.solution;
    const roomId = state?.roomId;
    const difficulty = state?.difficulty;

    const [userAnswers, setUserAnswers] = useState(Array.from({ length: 9 }, () => Array(9).fill(0)));
    const [notes, setNotes] = useState({});
    const [selectedCell, setSelectedCell] = useState(null);
    const [notesMode, setNotesMode] = useState(false);
    const [errors, setErrors] = useState({});
    const [errorCount, setErrorCount] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);

    const [myProgress, setMyProgress] = useState(0);
    const [opponentProgress, setOpponentProgress] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [opponentErrors, setOpponentErrors] = useState(0);
    const [opponentHints, setOpponentHints] = useState(0);
    const [completedNumbers, setCompletedNumbers] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const audioRef = useRef(null);
    const errorCountRef = useRef(0);
    const hintsUsedRef = useRef(0);
    const myProgressRef = useRef(0);

    // Sound function refs - always call the latest version, never stale
    const playWinSoundRef = useRef(null);
    const playLoseSoundRef = useRef(null);
    playLoseSoundRef.current = () => {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio('lose.mp3');
        audioRef.current = audio;
        audio.play().catch(e => console.log('Lose sound failed:', e));
        setTimeout(() => { if (audioRef.current === audio) audio.pause(); }, 30000);
    };
    playWinSoundRef.current = () => {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio('win.mp3');
        audioRef.current = audio;
        audio.play().catch(e => console.log('Win sound failed:', e));
        setTimeout(() => { if (audioRef.current === audio) audio.pause(); }, 30000);
    };

    useEffect(() => {
        if (!initialPuzzle) {
            navigate('/multiplayer');
            return;
        }

        const totalEmpty = initialPuzzle.flat().filter(c => c === 0).length;

        // Listen to opponent updates
        const handleOpponentProgress = (stats) => {
            console.log("Opponent Stats Received:", stats);
            if (typeof stats === 'number') {
                setOpponentProgress(stats);
            } else if (stats && typeof stats === 'object') {
                if (stats.progress !== undefined) setOpponentProgress(stats.progress);
                if (stats.errors !== undefined) setOpponentErrors(stats.errors);
                if (stats.hints !== undefined) setOpponentHints(stats.hints);
            }
        };
        const handleOpponentGameOver = ({ won: opponentWon }) => {
            setIsGameOver(true);
            setWon(!opponentWon);
            if (opponentWon) playLoseSoundRef.current?.(); // Opponent won → I lost
        };
        const handleDisconnect = () => {
            // Opponent left
            if (!isGameOver) {
                setOpponentDisconnected(true);
                setIsGameOver(true);
                setWon(true);
            }
        };

        const handleReceiveMessage = (data) => {
            setChatMessages(prev => [...prev.slice(-10), { text: data.message, sender: 'opponent' }]);
        };

        socket.on('opponentProgress', handleOpponentProgress);
        socket.on('opponentGameOver', handleOpponentGameOver);
        socket.on('opponentDisconnected', handleDisconnect);
        socket.on('receiveMessage', handleReceiveMessage);

        return () => {
            socket.off('opponentProgress', handleOpponentProgress);
            socket.off('opponentGameOver', handleOpponentGameOver);
            socket.off('opponentDisconnected', handleDisconnect);
            socket.off('receiveMessage', handleReceiveMessage);
        };
    }, [initialPuzzle, navigate]);

    // Separate useEffect for audio cleanup ON UNMOUNT only
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);


    const checkWin = useCallback((answers, currentErrors, currentHints) => {
        let emptyCount = 0;
        const counts = Array(10).fill(0);
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = initialPuzzle[r][c] || answers[r][c];
                if (val !== 0) counts[val]++;
                if (initialPuzzle[r][c] === 0 && answers[r][c] === 0) emptyCount++;
            }
        }

        const completed = [];
        for (let i = 1; i <= 9; i++) if (counts[i] === 9) completed.push(i);
        setCompletedNumbers(completed);

        // Calculate progress %
        const totalEmpty = initialPuzzle.flat().filter(val => val === 0).length;
        const filled = totalEmpty - emptyCount;
        const progress = Math.round((filled / totalEmpty) * 100);

        setMyProgress(progress);
        socket.emit('updateProgress', { progress, errors: currentErrors, hints: currentHints });

        if (emptyCount === 0) {
            setWon(true);
            setIsGameOver(true);
            socket.emit('gameOver', { won: true });
            playWinSoundRef.current?.();
            return;
        }
    }, [initialPuzzle]);

    const handleNumberClick = useCallback((num) => {
        if (!selectedCell || isGameOver) return;
        const { r, c } = selectedCell;
        if (initialPuzzle[r][c] !== 0) return;

        if (notesMode) {
            setNotes(prev => {
                const key = `${r}-${c}`;
                const cellNotes = prev[key] || [];
                if (cellNotes.includes(num)) {
                    return { ...prev, [key]: cellNotes.filter(n => n !== num) };
                } else {
                    return { ...prev, [key]: [...cellNotes, num].sort() };
                }
            });
        } else {
            // Check if correct
            if (solution[r][c] !== num) {
                setErrors(prev => ({ ...prev, [`${r}-${c}`]: true }));

                const nextErrors = errorCountRef.current + 1;
                errorCountRef.current = nextErrors;
                setErrorCount(nextErrors);

                socket.emit('updateProgress', { progress: myProgressRef.current, errors: nextErrors, hints: hintsUsedRef.current });

                if (nextErrors >= 3) {
                    setIsGameOver(true);
                    setWon(false);
                    socket.emit('gameOver', { won: false });
                    playLoseSound();
                }

                setTimeout(() => {
                    setErrors(prev => {
                        const next = { ...prev };
                        delete next[`${r}-${c}`];
                        return next;
                    });
                }, 1000);
            } else {
                const newAnswers = userAnswers.map(row => [...row]);
                newAnswers[r][c] = num;
                setUserAnswers(newAnswers);

                // Remove notes
                const newNotes = { ...notes };
                for (let i = 0; i < 9; i++) {
                    if (newNotes[`${r}-${i}`]) newNotes[`${r}-${i}`] = newNotes[`${r}-${i}`].filter(n => n !== num);
                    if (newNotes[`${i}-${c}`]) newNotes[`${i}-${c}`] = newNotes[`${i}-${c}`].filter(n => n !== num);
                }
                const startR = Math.floor(r / 3) * 3;
                const startC = Math.floor(c / 3) * 3;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        let nr = startR + i;
                        let nc = startC + j;
                        if (newNotes[`${nr}-${nc}`]) newNotes[`${nr}-${nc}`] = newNotes[`${nr}-${nc}`].filter(n => n !== num);
                    }
                }
                setNotes(newNotes);
                
                const totalEmpty = initialPuzzle.flat().filter(c => c === 0).length;
                let emptyCountNum = 0;
                for (let r2 = 0; r2 < 9; r2++) {
                    for (let c2 = 0; c2 < 9; c2++) {
                        if (initialPuzzle[r2][c2] === 0 && newAnswers[r2][c2] === 0) emptyCountNum++;
                    }
                }
                const currentProgress = Math.round(((totalEmpty - emptyCountNum) / totalEmpty) * 100);
                myProgressRef.current = currentProgress;
                setMyProgress(currentProgress);
                socket.emit('updateProgress', { progress: currentProgress, errors: errorCountRef.current, hints: hintsUsedRef.current });

                checkWin(newAnswers, errorCountRef.current, hintsUsedRef.current);
            }
        }
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, solution, userAnswers, notes, checkWin]);

    const handleActionClick = useCallback((action) => {
        if (!selectedCell || isGameOver) return;
        const { r, c } = selectedCell;

        if (action === 'notes') setNotesMode(!notesMode);
        else if (action === 'erase') {
            if (initialPuzzle[r][c] === 0) {
                const newAnswers = userAnswers.map(row => [...row]);
                newAnswers[r][c] = 0;
                setUserAnswers(newAnswers);
            }
        } else if (action === 'hint') {
            if (hintsUsed >= 3) return;
            if (initialPuzzle[r][c] === 0 && userAnswers[r][c] === 0) {
                const corrNum = solution[r][c];
                const newAnswers = userAnswers.map(row => [...row]);
                newAnswers[r][c] = corrNum;
                setUserAnswers(newAnswers);
                
                const newHints = hintsUsed + 1;
                hintsUsedRef.current = newHints;
                setHintsUsed(newHints);
                checkWin(newAnswers, errorCountRef.current, newHints);
            }
        }
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, userAnswers, handleNumberClick, solution]);


    useEffect(() => {
        const handleKeyDown = (e) => {
            // If the user is typing in chat (or any input), ignore ALL game shortcuts
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (e.key >= '1' && e.key <= '9') {
                handleNumberClick(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleActionClick('erase');
            } else if (e.key === 'n' || e.key === 'N') {
                handleActionClick('notes');
            } else if (e.key.startsWith('Arrow')) {
                if (!selectedCell) {
                    setSelectedCell({ r: 0, c: 0 });
                    return;
                }
                let { r, c } = selectedCell;
                if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
                if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
                if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
                if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
                setSelectedCell({ r, c });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, handleNumberClick, handleActionClick]);

    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        if (!msgInput.trim()) return;
        socket.emit('sendMessage', { message: msgInput });
        setChatMessages(prev => [...prev.slice(-10), { text: msgInput, sender: 'me' }]);
        setMsgInput('');
    };

    const handleQuit = () => {
        if (!isGameOver) {
            socket.emit('gameOver', { won: false });
            setIsGameOver(true);
            setWon(false);
            playLoseSoundRef.current?.();
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            navigate('/');
        }
    };

    if (!initialPuzzle) return null;

    return (
        <div className="game-container">
            <div className="sudoku-container glass-panel" style={{ position: 'relative' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ flex: 1, textAlign: 'left', paddingRight: '10px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>You</div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${myProgress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{myProgress}%</div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'right', paddingLeft: '10px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Opponent</div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${opponentProgress}%`, height: '100%', background: '#a371f7', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '2px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <span>{opponentProgress}%</span>
                            <span style={{ color: opponentErrors >= 2 ? 'var(--error-color)' : 'inherit' }}>Errors: {opponentErrors}/3</span>
                            <span>Hints: {opponentHints}/3</span>
                        </div>
                    </div>
                </div>

                <div className="header-info" style={{ marginBottom: '10px', width: '100%', maxWidth: 'none', justifyContent: 'space-around' }}>
                    <span>Room ID: {roomId}</span>
                    <span>Difficulty: {difficulty}</span>
                    <span>My Mistakes: {errorCount}/3</span>
                    <span>My Hints: {hintsUsed}/3</span>
                </div>

                <div className="main-play-area">
                    <Board
                        initialPuzzle={initialPuzzle}
                        userAnswers={userAnswers}
                        notes={notes}
                        selectedCell={selectedCell}
                        setSelectedCell={setSelectedCell}
                        errors={errors}
                    />

                    <div className="side-panel">
                        <div className="glass-panel controls-panel" style={{ background: 'transparent', padding: 0 }}>
                            <Controls
                                onNumberClick={handleNumberClick}
                                onActionClick={handleActionClick}
                                notesMode={notesMode}
                                completedNumbers={completedNumbers}
                            />

                            <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={handleQuit}>
                                {isGameOver ? 'Back to Menu' : 'Quit Game'}
                            </button>
                        </div>

                        {/* Chat Box */}
                        <div className="glass-panel chat-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column' }}>
                            <div className="chat-messages" style={{ flex: 1, minHeight: '150px', maxHeight: '300px', overflowY: 'auto', marginBottom: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {chatMessages.length === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No messages yet...</span>}
                                {chatMessages.map((m, i) => (
                                    <div key={i} style={{ alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start', background: m.sender === 'me' ? 'var(--accent-color)' : '#334155', padding: '4px 10px', borderRadius: '12px', maxWidth: '80%' }}>
                                        {m.text}
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '5px' }}>
                                <input 
                                    type="text" 
                                    value={msgInput} 
                                    onChange={e => setMsgInput(e.target.value)}
                                    placeholder="Chat..."
                                    style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#2d3748', border: '1px solid #4a5568', color: '#fff', fontSize: '0.85rem' }}
                                />
                                <button type="submit" className="btn-primary" style={{ padding: '8px 12px', width: 'auto', fontSize: '0.85rem' }}>Send</button>
                            </form>
                        </div>
                    </div>

                    {isGameOver && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(13, 17, 23, 0.85)', backdropFilter: 'blur(4px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '16px', zIndex: 10
                        }}>
                            <h2 style={{ color: won ? 'var(--success-color)' : 'var(--error-color)', fontSize: '2.5rem', margin: 0 }}>
                                {won ? 'You Won!' : 'You Lost!'}
                            </h2>
                            <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                                {opponentDisconnected && won ? 'Opponent disconnected.' : (won ? 'You solved it first.' : 'Better luck next time!')}
                            </p>
                            <button className="btn-primary" style={{ marginTop: '20px', width: 'auto' }} onClick={() => navigate('/multiplayer')}>
                                Return to Lobby
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
