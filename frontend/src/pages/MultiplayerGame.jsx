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
    const audioRef = useRef(null);

    useEffect(() => {
        if (!initialPuzzle) {
            navigate('/multiplayer');
            return;
        }

        const totalEmpty = initialPuzzle.flat().filter(c => c === 0).length;

        // Listen to opponent updates
        const handleOpponentProgress = (stats) => {
            console.log("Opponent Stats Received:", stats);
            if (stats.progress !== undefined) setOpponentProgress(stats.progress);
            if (stats.errors !== undefined) setOpponentErrors(stats.errors);
            if (stats.hints !== undefined) setOpponentHints(stats.hints);
        };
        const handleOpponentGameOver = ({ won: opponentWon }) => {
            setIsGameOver(true);
            setWon(!opponentWon); // If opponent won, I lost. If opponent lost, I won.
            if (opponentWon) playLoseSound(); // Opponent won means I lost -> play sad sound
        };
        const handleDisconnect = () => {
            // Opponent left
            if (!isGameOver) {
                setOpponentDisconnected(true);
                setIsGameOver(true);
                setWon(true);
            }
        };

        socket.on('opponentProgress', handleOpponentProgress);
        socket.on('opponentGameOver', handleOpponentGameOver);
        socket.on('opponentDisconnected', handleDisconnect);

        return () => {
            socket.off('opponentProgress', handleOpponentProgress);
            socket.off('opponentGameOver', handleOpponentGameOver);
            socket.off('opponentDisconnected', handleDisconnect);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [initialPuzzle, navigate, isGameOver]);

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
            playLoseSound(); // I won, so opponent "lost"
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
                const newErrorCount = errorCount + 1;
                setErrorCount(newErrorCount);

                socket.emit('updateProgress', { progress: myProgress, errors: newErrorCount, hints: hintsUsed });

                if (newErrorCount >= 3) {
                    setIsGameOver(true);
                    setWon(false);
                    socket.emit('gameOver', { won: false });
                    playLoseSound(); // I lost (reached mistake limit)
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
                socket.emit('updateProgress', { progress: currentProgress, errors: errorCount, hints: hintsUsed });

                checkWin(newAnswers, errorCount, hintsUsed);
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
                setHintsUsed(newHints);
                checkWin(newAnswers, errorCount, newHints);
            }
        }
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, userAnswers, handleNumberClick, solution]);

    const playLoseSound = () => {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio('lose.mp3');
        audioRef.current = audio;
        audio.play().catch(e => console.log("Audio play failed:", e));
        
        // Stop after 30s
        setTimeout(() => {
            if (audioRef.current === audio) {
                audio.pause();
            }
        }, 30000);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
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

    const handleQuit = () => {
        if (!isGameOver) {
            socket.emit('gameOver', { won: false });
            setIsGameOver(true);
            setWon(false);
            playLoseSound();
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
                        <div style={{ fontSize: '0.8rem', marginTop: '2px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <span>{opponentProgress}%</span>
                            <span style={{ color: opponentErrors >= 2 ? 'var(--error-color)' : 'inherit' }}>Err: {opponentErrors}/3</span>
                            <span>Hnt: {opponentHints}/3</span>
                        </div>
                    </div>
                </div>

                <div className="header-info" style={{ marginBottom: '10px', width: '100%', maxWidth: 'none' }}>
                    <span>Room: {roomId}</span>
                    <span>Diff: {difficulty}</span>
                    <span>Me: E{errorCount}/3 H{hintsUsed}/3</span>
                </div>

                <Board
                    initialPuzzle={initialPuzzle}
                    userAnswers={userAnswers}
                    notes={notes}
                    selectedCell={selectedCell}
                    setSelectedCell={setSelectedCell}
                    errors={errors}
                />

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

            <div className="glass-panel controls-panel">
                <Controls
                    onNumberClick={handleNumberClick}
                    onActionClick={handleActionClick}
                    notesMode={notesMode}
                    completedNumbers={completedNumbers}
                />

                <button className="btn-secondary" style={{ marginTop: '40px' }} onClick={handleQuit}>
                    {isGameOver ? 'Back to Menu' : 'Quit Game'}
                </button>
            </div>
        </div>
    );
}
