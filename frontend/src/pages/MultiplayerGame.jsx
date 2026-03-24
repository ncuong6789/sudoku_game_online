import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import Controls from '../components/Controls';
import { socket } from '../utils/socket';

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

    const [myProgress, setMyProgress] = useState(0);
    const [opponentProgress, setOpponentProgress] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);

    useEffect(() => {
        if (!initialPuzzle) {
            navigate('/multiplayer');
            return;
        }

        const totalEmpty = initialPuzzle.flat().filter(c => c === 0).length;

        // Listen to opponent updates
        const handleOpponentProgress = (prog) => setOpponentProgress(prog);
        const handleOpponentGameOver = ({ won }) => {
            setIsGameOver(true);
            setWon(false);
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
        };
    }, [initialPuzzle, navigate, isGameOver]);

    const checkWin = useCallback((answers) => {
        let emptyCount = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (initialPuzzle[r][c] === 0 && answers[r][c] === 0) emptyCount++;
            }
        }

        // Calculate progress %
        const totalEmpty = initialPuzzle.flat().filter(val => val === 0).length;
        const filled = totalEmpty - emptyCount;
        const progress = Math.round((filled / totalEmpty) * 100);

        setMyProgress(progress);
        socket.emit('updateProgress', { progress });

        if (emptyCount === 0) {
            setWon(true);
            setIsGameOver(true);
            socket.emit('gameOver', { won: true });
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
                setErrorCount(c => c + 1);
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

                checkWin(newAnswers);
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
            if (initialPuzzle[r][c] === 0 && userAnswers[r][c] === 0) handleNumberClick(solution[r][c]);
        }
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, userAnswers, handleNumberClick, solution]);

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
                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{opponentProgress}%</div>
                    </div>
                </div>

                <div className="header-info" style={{ marginBottom: '10px' }}>
                    <span>Room: {roomId}</span>
                    <span>Diff: {difficulty}</span>
                    <span>Errors: {errorCount}</span>
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
                            {opponentDisconnected && won ? 'Opponent disconnected.' : (won ? 'You solved it first.' : 'Your opponent finished first.')}
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
                />

                <button className="btn-secondary" style={{ marginTop: '40px' }} onClick={() => {
                    // Might need to disconnect properly later
                    navigate('/');
                }}>
                    Quit Game
                </button>
            </div>
        </div>
    );
}
