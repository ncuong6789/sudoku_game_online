import { useState, useEffect, useCallback } from 'react';
import { generateSudoku } from '../../utils/sudoku';

export function useSudokuLogic(initialDifficulty, callbacks) {
    const { onWin, onLose } = callbacks || {};

    const [difficulty, setDifficulty] = useState(initialDifficulty || 'Medium');
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

    const startNewGame = useCallback((diff) => {
        const difficultyToUse = diff || difficulty;
        const { puzzle, solution: sol } = generateSudoku(difficultyToUse);
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
        setDifficulty(difficultyToUse);
        setHintsUsed(0);
        setCompletedNumbers([]);
    }, [difficulty]);

    useEffect(() => {
        if (!initialPuzzle) {
            startNewGame(initialDifficulty || 'Medium');
        }
    }, [startNewGame, initialDifficulty, initialPuzzle]);

    useEffect(() => {
        let interval;
        if (!isGameOver && initialPuzzle) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isGameOver, initialPuzzle]);

    const checkWin = useCallback((answers) => {
        if (!initialPuzzle) return;
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
            onWin?.();
        }
    }, [initialPuzzle, onWin]);

    const handleNumberClick = useCallback((num) => {
        if (!selectedCell || isGameOver || !initialPuzzle) return;
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
                setErrorCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 3 && !isGameOver) {
                        setIsGameOver(true);
                        setWon(false);
                        onLose?.();
                    }
                    return newCount;
                });
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
    }, [selectedCell, isGameOver, initialPuzzle, notesMode, solution, userAnswers, notes, onLose, checkWin]);

    const handleActionClick = useCallback((action) => {
        if (!selectedCell || isGameOver || !initialPuzzle) return;
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
    }, [selectedCell, isGameOver, notesMode, initialPuzzle, userAnswers, solution, handleNumberClick]);

    return {
        difficulty,
        initialPuzzle,
        solution,
        userAnswers,
        notes,
        selectedCell,
        setSelectedCell,
        notesMode,
        errors,
        completedNumbers,
        isGameOver,
        errorCount,
        time,
        won,
        hintsUsed,
        startNewGame,
        handleNumberClick,
        handleActionClick,
        setNotesMode
    };
}
