import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateSudoku } from '../utils/sudoku';
import Board from '../components/Board';
import Controls from '../components/Controls';
import { useNavigate } from 'react-router-dom';

export default function SoloGame() {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('Medium');
    const [initialPuzzle, setInitialPuzzle] = useState(null);
    const [solution, setSolution] = useState(null);
    const [userAnswers, setUserAnswers] = useState(null);
    const [notes, setNotes] = useState({});
    const [selectedCell, setSelectedCell] = useState(null);
    const [notesMode, setNotesMode] = useState(false);
    const [errors, setErrors] = useState({});
    const [completedNumbers, setCompletedNumbers] = useState([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [errorCount, setErrorCount] = useState(0);
    const [time, setTime] = useState(0);
    const [won, setWon] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const audioRef = useRef(null);

    // Sound function refs
    const playWinSoundRef = useRef(null);
    const playLoseSoundRef = useRef(null);
    const winAudioRef = useRef(new Audio('/win.mp3'));
    const loseAudioRef = useRef(new Audio('/lose.mp3'));

    // Preload sounds
    useEffect(() => {
        winAudioRef.current.load();
        loseAudioRef.current.load();
    }, []);

    playLoseSoundRef.current = () => {
        console.log('Solo: Triggering Lose Sound...');
        if (audioRef.current) audioRef.current.pause();
        const audio = loseAudioRef.current;
        audio.currentTime = 0;
        audioRef.current = audio;
        audio.play().catch(e => console.log('Lose sound failed:', e));
        setTimeout(() => { if (audioRef.current === audio) audio.pause(); }, 30000);
    };
    playWinSoundRef.current = () => {
        console.log('Solo: Triggering Win Sound...');
        if (audioRef.current) audioRef.current.pause();
        const audio = winAudioRef.current;
        audio.currentTime = 0;
        audioRef.current = audio;
        audio.play().catch(e => console.log('Win sound failed:', e));
        setTimeout(() => { if (audioRef.current === audio) audio.pause(); }, 30000);
    };

    const startNewGame = useCallback((diff) => {
        const { puzzle, solution: sol } = generateSudoku(diff);
        setInitialPuzzle(puzzle);
        setSolution(sol);
        setUserAnswers(Array.from({ length: 9 }, () => Array(9).fill(0)));
        setNotes({});
        setErrors({});
        setErrorCount(0);
        setTime(0);
        setSelectedCell(null);
        setIsGameOver(false);
        setWon(false);
        setDifficulty(diff);
        setHintsUsed(0);
    }, []);

    useEffect(() => {
        startNewGame('Medium');
    }, [startNewGame]);

    useEffect(() => {
        let interval;
        if (!isGameOver && initialPuzzle) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isGameOver, initialPuzzle]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const checkWin = useCallback((answers) => {
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

        if (emptyCount === 0) {
            setWon(true);
            setIsGameOver(true);
            playWinSoundRef.current?.();
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
                setErrorCount(prev => prev + 1);
                // Remove error highlight after 1s
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

                // Remove notes from row, col, box
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

                checkWin(newAnswers);
            }
        }
    }, [selectedCell, isGameOver, initialPuzzle, notesMode, solution, userAnswers, notes, errorCount, checkWin]);



    const handleActionClick = useCallback((action) => {
        if (!selectedCell || isGameOver) return;
        const { r, c } = selectedCell;

        if (action === 'notes') {
            setNotesMode(!notesMode);
        } else if (action === 'erase') {
            if (initialPuzzle[r][c] === 0) {
                const newAnswers = userAnswers.map(row => [...row]);
                newAnswers[r][c] = 0;
                setUserAnswers(newAnswers);
            }
        } else if (action === 'hint') {
            if (initialPuzzle[r][c] === 0 && userAnswers[r][c] === 0) {
                handleNumberClick(solution[r][c]);
                setHintsUsed(h => h + 1);
            }
        }
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, userAnswers, solution, handleNumberClick, hintsUsed]);

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

    if (!initialPuzzle) return <div className="glass-panel">Loading...</div>;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="game-container">
            <div className="sudoku-container glass-panel">
                <div className="header-info">
                    <span>Difficulty: {difficulty}</span>
                    <span>Mistakes: {errorCount}</span>
                    <span>Hints: {hintsUsed}</span>
                    <span>Time: {formatTime(time)}</span>
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

                    <div className="glass-panel controls-panel">
                        <div className="difficulty-selector">
                            {['Easy', 'Medium', 'Hard', 'Expert'].map(d => (
                                <button
                                    key={d}
                                    className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                                    onClick={() => startNewGame(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        <Controls
                            onNumberClick={handleNumberClick}
                            onActionClick={handleActionClick}
                            notesMode={notesMode}
                            completedNumbers={completedNumbers}
                        />

                        <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={() => {
                            if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current = null;
                            }
                            navigate('/sudoku');
                        }}>
                            Return to Menu
                        </button>
                    </div>
                </div>

                {isGameOver && (
                    <div style={{ marginTop: '20px', color: 'var(--success-color)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        You Won! Congratulations!
                    </div>
                )}
            </div>
        </div>
    );
}
